import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type * as CocoSsd from '@tensorflow-models/coco-ssd';
import sharp from 'sharp';
import { extractJpegBuffer } from './jpeg-buffer.util';

const SSD_BASES = new Set(['mobilenet_v1', 'mobilenet_v2', 'lite_mobilenet_v2']);

function resolveSsdBase(): 'mobilenet_v1' | 'mobilenet_v2' | 'lite_mobilenet_v2' {
  const raw = process.env.CAMERA_PERSON_SSD_BASE?.trim();
  if (raw && SSD_BASES.has(raw)) {
    return raw as 'mobilenet_v1' | 'mobilenet_v2' | 'lite_mobilenet_v2';
  }
  /** `mobilenet_v2` suele detectar personas algo mejor que lite; `lite_mobilenet_v2` es más rápido en CPU. */
  return 'mobilenet_v2';
}

/**
 * Re-encode JPEG con sharp: muchas cámaras IP generan JPEG “raros” que hacen que
 * libjpeg (vía TensorFlow) imprima “Corrupt JPEG…” y a veces decodifique mal.
 */
async function sanitizeJpegForMl(buf: Buffer, log: Logger): Promise<Buffer> {
  const trimmed = extractJpegBuffer(buf);
  try {
    const out = await sharp(trimmed, { failOn: 'none' })
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
    if (out.length >= 64) {
      return out;
    }
  } catch (e) {
    log.debug(
      `sharp no pudo re-encodear JPEG (${e instanceof Error ? e.message : String(e)}), se usa buffer recortado`,
    );
  }
  return trimmed;
}

/**
 * Detección de **personas** con COCO SSD.
 * Solo la clase `person` cuenta; animales/insectos suelen ser otras clases.
 */
@Injectable()
export class PersonDetectionService implements OnModuleInit {
  private readonly logger = new Logger(PersonDetectionService.name);
  private model: CocoSsd.ObjectDetection | null = null;
  private loadPromise: Promise<void> | null = null;
  private loadFailed = false;
  /** Etiqueta para metadata de alertas (p. ej. coco-ssd_lite_mobilenet_v2). */
  private loadedModelId = 'coco-ssd_pending';

  async onModuleInit(): Promise<void> {
    if (process.env.CAMERA_PERSON_ML_ENABLED === '0') {
      this.logger.log('Detección ML de personas desactivada (CAMERA_PERSON_ML_ENABLED=0)');
      return;
    }
    void this.ensureModel().catch((e) => {
      this.logger.error(`No se pudo cargar COCO-SSD: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  getLoadedModelId(): string {
    return this.loadedModelId;
  }

  /** Precarga el modelo en segundo plano al arrancar. */
  async ensureModel(): Promise<boolean> {
    if (process.env.CAMERA_PERSON_ML_ENABLED === '0') return false;
    if (this.loadFailed) return false;
    if (this.model) return true;
    if (!this.loadPromise) {
      this.loadPromise = this.loadModelInner();
    }
    try {
      await this.loadPromise;
    } catch {
      return false;
    }
    return this.model != null;
  }

  private async loadModelInner(): Promise<void> {
    try {
      const tf = await import('@tensorflow/tfjs-node');
      await tf.ready();
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      const base = resolveSsdBase();
      this.model = await cocoSsd.load({
        base,
      });
      this.loadedModelId = `coco-ssd_${base}`;
      this.logger.log(`Modelo COCO-SSD cargado (${base}) para detección de personas`);
    } catch (e) {
      this.loadFailed = true;
      throw e;
    }
  }

  /**
   * COCO-SSD filtra internamente con `minScore` en `detect()`.
   * Pasamos umbral interno bajo y aplicamos aquí el umbral real del usuario.
   */
  async detectPerson(
    jpegBuffer: Buffer,
    minScore: number,
    maxInputSide: number,
  ): Promise<{ isPerson: boolean; bestScore: number; rawPersonScores: number[] }> {
    if (process.env.CAMERA_PERSON_ML_ENABLED === '0') {
      return { isPerson: false, bestScore: 0, rawPersonScores: [] };
    }
    const ok = await this.ensureModel();
    if (!ok || !this.model) {
      return { isPerson: false, bestScore: 0, rawPersonScores: [] };
    }

    const tf = await import('@tensorflow/tfjs-node');
    let imageTensor: ReturnType<typeof tf.node.decodeImage> | null = null;
    try {
      const decodeBuf = await sanitizeJpegForMl(jpegBuffer, this.logger);
      imageTensor = tf.node.decodeImage(decodeBuf, 3);
      const shape = imageTensor.shape;
      const h = shape[0] as number;
      const w = shape[1] as number;
      const longSide = Math.max(h, w);
      if (longSide > maxInputSide) {
        const scale = maxInputSide / longSide;
        const nh = Math.max(1, Math.round(h * scale));
        const nw = Math.max(1, Math.round(w * scale));
        const resized = tf.image.resizeBilinear(imageTensor, [nh, nw]);
        imageTensor.dispose();
        imageTensor = resized;
      }

      /**
       * COCO-SSD (SavedModel en tfjs) exige `image_tensor` en **int32** (píxeles 0–255).
       * `resizeBilinear` devuelve float32.
       */
      if (imageTensor.dtype !== 'int32') {
        const asInt = tf.cast(imageTensor, 'int32');
        imageTensor.dispose();
        imageTensor = asInt;
      }

      /** Umbral bajo en NMS para no perder cajas “person” antes de filtrar por `minScore`. */
      const internalMin = Math.min(0.12, Math.max(0.03, minScore * 0.3));
      const predictions = await this.model.detect(
        imageTensor as import('@tensorflow/tfjs').Tensor3D,
        40,
        internalMin,
      );

      const personPreds = predictions.filter((p) => p.class === 'person');
      const rawPersonScores = personPreds.map((p) => p.score);
      const passing = personPreds.filter((p) => p.score >= minScore);
      const bestScore = passing.length > 0 ? Math.max(...passing.map((p) => p.score)) : 0;

      if (process.env.CAMERA_PERSON_DEBUG === '1') {
        const sorted = [...predictions].sort((a, b) => b.score - a.score);
        const top = sorted[0];
        this.logger.log(
          `[CAMERA_PERSON_DEBUG] ${w}×${h} → objetos SSD=${predictions.length}` +
            (top ? ` top=${top.class}(${top.score.toFixed(3)})` : '') +
            ` personas(raw)=${personPreds.length} umbral=${minScore}`,
        );
      }

      return {
        isPerson: passing.length > 0,
        bestScore,
        rawPersonScores,
      };
    } catch (e) {
      this.logger.warn(`Persona ML: ${e instanceof Error ? e.message : String(e)}`);
      return { isPerson: false, bestScore: 0, rawPersonScores: [] };
    } finally {
      imageTensor?.dispose();
    }
  }
}
