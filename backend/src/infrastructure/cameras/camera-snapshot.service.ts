import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';
import { buildDigestAuthorizationHeader } from './digest-auth.util';

/** Rutas habituales de snapshot (orden: las más usadas primero). */
const SNAPSHOT_PATHS = [
  '/Streaming/channels/1/picture',
  '/ISAPI/Streaming/channels/101/picture',
  '/cgi-bin/snapshot.cgi?channel=1',
  '/cgi-bin/snapshot.cgi',
  '/snapshot.jpg',
  '/jpg/image.jpg',
  '/onvif-http/snapshot',
  '/api/hikvision/Streaming/channels/1/picture',
  '/video/mjpg.cgi',
];

/** Por intento (evita bloqueos largos que dejan el front en “Conectando…”). */
const FETCH_TIMEOUT_MS = 3500;

/** Intentos en paralelo por lote (más rápido que 18× secuencial). */
const PARALLEL_BATCH = 5;

const TLS_INSECURE =
  process.env.CAMERA_SNAPSHOT_TLS_INSECURE === '1' ||
  process.env.CAMERA_SNAPSHOT_TLS_INSECURE === 'true';

@Injectable()
export class CameraSnapshotService {
  constructor(
    @Inject('CameraRepositoryPort')
    private readonly cameraRepository: CameraRepositoryPort,
  ) {}

  private decryptPassword(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }

  private looksLikeJpeg(buf: Buffer): boolean {
    return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8;
  }

  private looksLikePng(buf: Buffer): boolean {
    return (
      buf.length > 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    );
  }

  private contentTypeFor(buf: Buffer): string {
    if (this.looksLikeJpeg(buf)) return 'image/jpeg';
    if (this.looksLikePng(buf)) return 'image/png';
    return 'application/octet-stream';
  }

  /**
   * GET con cabecera Authorization libre (Basic o Digest).
   * Devuelve cabeceras para detectar Digest tras 401.
   */
  private requestGet(
    urlStr: string,
    authorizationHeader: string,
  ): Promise<{
    status: number;
    buf: Buffer;
    contentType: string;
    headers: http.IncomingHttpHeaders;
  }> {
    return new Promise((resolve, reject) => {
      let url: URL;
      try {
        url = new URL(urlStr);
      } catch {
        reject(new Error('URL inválida'));
        return;
      }

      const isHttps = url.protocol === 'https:';
      const mod = isHttps ? https : http;
      const defaultPort = isHttps ? '443' : '80';
      const port = url.port || defaultPort;

      const opts: http.RequestOptions = {
        hostname: url.hostname,
        port: Number(port),
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          Authorization: authorizationHeader,
          Accept: 'image/*,*/*;q=0.8',
        },
        timeout: FETCH_TIMEOUT_MS,
      };

      if (isHttps && TLS_INSECURE) {
        (opts as https.RequestOptions).rejectUnauthorized = false;
      }

      const req = mod.request(opts, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const ct = (res.headers['content-type'] as string) ?? '';
          resolve({
            status: res.statusCode ?? 0,
            buf,
            contentType: ct,
            headers: res.headers,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });
      req.end();
    });
  }

  /** Basic y, si la cámara pide Digest, segundo intento con Digest. */
  private async fetchUrlWithAuth(
    urlStr: string,
    username: string,
    password: string,
  ): Promise<{ status: number; buf: Buffer; contentType: string }> {
    const basic = `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
    let r = await this.requestGet(urlStr, basic);

    if (r.status === 401) {
      const wwwRaw = r.headers['www-authenticate'];
      const parts = Array.isArray(wwwRaw) ? wwwRaw : wwwRaw ? [wwwRaw] : [];
      const digestLine = parts.find((h) => /digest/i.test(h));
      if (digestLine) {
        const u = new URL(urlStr);
        const requestUri = `${u.pathname}${u.search}`;
        const digestAuth = buildDigestAuthorizationHeader(
          'GET',
          requestUri,
          username,
          password,
          digestLine,
        );
        if (digestAuth) {
          r = await this.requestGet(urlStr, digestAuth);
        }
      }
    }

    return { status: r.status, buf: r.buf, contentType: r.contentType };
  }

  private isValidImage(status: number, buf: Buffer, contentType: string): boolean {
    if (status < 200 || status >= 300) return false;
    if (buf.length < 64) return false;
    return (
      contentType.includes('image') ||
      this.looksLikeJpeg(buf) ||
      this.looksLikePng(buf)
    );
  }

  async fetchSnapshot(cameraId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const camera = await this.cameraRepository.findById(cameraId);
    if (!camera) {
      throw new NotFoundException('Cámara no encontrada');
    }

    const password = this.decryptPassword(camera.passwordEncrypted);
    const { ipAddress, port, username } = camera;

    const urls: string[] = [];
    for (const scheme of ['http', 'https'] as const) {
      for (const path of SNAPSHOT_PATHS) {
        urls.push(`${scheme}://${ipAddress}:${port}${path}`);
      }
    }

    const errors: string[] = [];

    for (let i = 0; i < urls.length; i += PARALLEL_BATCH) {
      const batch = urls.slice(i, i + PARALLEL_BATCH);
      const results = await Promise.all(
        batch.map(async (url) => {
          try {
            const { status, buf, contentType } = await this.fetchUrlWithAuth(
              url,
              username,
              password,
            );
            if (this.isValidImage(status, buf, contentType)) {
              return {
                buffer: buf,
                contentType: this.contentTypeFor(buf),
              };
            }
            if (status >= 400) {
              errors.push(`${url}: HTTP ${status}`);
            } else if (buf.length < 64) {
              errors.push(`${url}: respuesta muy pequeña`);
            } else {
              errors.push(`${url}: no es imagen (tipo ${contentType || '?'})`);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${url}: ${msg}`);
          }
          return null;
        }),
      );

      const hit = results.find((x): x is NonNullable<typeof x> => x !== null);
      if (hit) return hit;
    }

    const hintTls =
      !TLS_INSECURE
        ? ' Si usa HTTPS con certificado propio: CAMERA_SNAPSHOT_TLS_INSECURE=1 (solo LAN de confianza).'
        : '';

    throw new BadGatewayException(
      `No se pudo obtener imagen (${ipAddress}:${port}). ` +
        `El navegador puede usar sesión/cookies o Digest; el servidor ya prueba Basic y Digest.${hintTls} ` +
        `Primeros errores: ${errors.slice(0, 6).join(' | ')}`,
    );
  }
}
