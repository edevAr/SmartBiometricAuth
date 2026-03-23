import { useCameraLiveSnapshot } from './useCameraLiveSnapshot';

type CameraLivePreviewProps = {
  cameraId: string;
  title?: string;
};

export function CameraLivePreview({ cameraId, title }: CameraLivePreviewProps) {
  const { imageUrl, error, loading } = useCameraLiveSnapshot(cameraId);

  return (
    <div className="dash-live-camera-box">
      {title ? <p className="dash-live-camera-title">{title}</p> : null}
      {loading && !imageUrl ? (
        <p className="dash-live-camera-status">Conectando con la cámara…</p>
      ) : null}
      {error ? <p className="dash-live-camera-error">{error}</p> : null}
      {imageUrl ? (
        <div className="dash-live-camera-frame">
          <img
            src={imageUrl}
            alt="Vista en vivo de la cámara IP"
            className="dash-live-camera-img"
          />
          <p className="dash-live-camera-caption">
            Actualización automática ~cada segundo (fotograma vía HTTP; el análisis de personas va por otro intervalo en el servidor).
          </p>
        </div>
      ) : null}
    </div>
  );
}
