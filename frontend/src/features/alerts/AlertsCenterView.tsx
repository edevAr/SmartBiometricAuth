import { useMemo, useState } from 'react';
import { useCamerasQuery } from '../cameras/api';
import { useAlertsQuery, useUpdateAlertMutation, type AlertItem } from './api';

type AlertsCenterViewProps = {
  onRegisterContact?: () => void;
};

function IconWarningTriangle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m15 9-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

type HistoryFilter = 'all' | 'camera' | 'access';

function isCameraVisionType(t: string): boolean {
  return t === 'MOTION_DETECTED' || t === 'PERSON_DETECTED';
}

function alertTitle(a: AlertItem): string {
  switch (a.type) {
    case 'PERSON_DETECTED':
      return 'Posible persona en cámara';
    case 'MOTION_DETECTED':
      return 'Movimiento detectado';
    case 'UNAUTHORIZED_ACCESS':
      return 'Acceso no autorizado';
    default:
      return a.message.slice(0, 80) || 'Alerta';
  }
}

function alertCaptureDataUrl(a: AlertItem): string | null {
  if (!a.captureImageBase64?.trim()) return null;
  const mime = a.captureMimeType ?? 'image/jpeg';
  return `data:${mime};base64,${a.captureImageBase64}`;
}

function AlertsActiveMediaPanel({
  alert: a,
  locationLabel,
}: {
  alert: AlertItem;
  locationLabel: string;
}) {
  const captureUrl = alertCaptureDataUrl(a);
  return (
    <div className="alerts-active-media" aria-hidden={!captureUrl}>
      <span className="alerts-intruso-tag">{alertTag(a)}</span>
      {captureUrl ? (
        <img
          className="alerts-capture-img"
          src={captureUrl}
          alt="Fotograma capturado en el momento de la alerta"
          loading="lazy"
        />
      ) : (
        <div className="alerts-media-placeholder">
          {a.type === 'PERSON_DETECTED' ? '!' : a.type === 'MOTION_DETECTED' ? '↻' : '?'}
        </div>
      )}
      <span className="alerts-location-pill">{locationLabel}</span>
    </div>
  );
}

function alertTag(a: AlertItem): string {
  switch (a.type) {
    case 'PERSON_DETECTED':
      return 'PERSONA';
    case 'MOTION_DETECTED':
      return 'MOVIMIENTO';
    case 'UNAUTHORIZED_ACCESS':
      return 'ACCESO';
    default:
      return 'ALERTA';
  }
}

export function AlertsCenterView({ onRegisterContact }: AlertsCenterViewProps) {
  const { data: alerts, isLoading } = useAlertsQuery();
  const { data: cameras } = useCamerasQuery();
  const updateMutation = useUpdateAlertMutation();
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const cameraById = useMemo(() => {
    const m = new Map<string, string>();
    cameras?.forEach((c) =>
      m.set(c.id, (c.location?.trim() || c.name || c.ipAddress) as string),
    );
    return m;
  }, [cameras]);

  const list = alerts ?? [];

  const summary = useMemo(() => {
    const open = list.filter((a) => a.status === 'OPEN').length;
    const ack = list.filter((a) => a.status === 'ACKNOWLEDGED').length;
    const resolved = list.filter((a) => a.status === 'RESOLVED').length;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = list.filter((a) => new Date(a.createdAt) >= start).length;
    return { open, ack, resolved, today };
  }, [list]);

  const openAlerts = useMemo(
    () => list.filter((a) => a.status === 'OPEN').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [list],
  );
  const active = openAlerts[0];

  const filteredHistory = useMemo(() => {
    const sorted = [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (historyFilter === 'camera') return sorted.filter((a) => isCameraVisionType(a.type));
    if (historyFilter === 'access') return sorted.filter((a) => a.type === 'UNAUTHORIZED_ACCESS');
    return sorted;
  }, [list, historyFilter]);

  const cameraLabel = (a: AlertItem) =>
    a.cameraId ? cameraById.get(a.cameraId) ?? a.cameraId.slice(0, 8) + '…' : '—';

  return (
    <div className="alerts-page">
      <header className="alerts-page-head">
        <h1 className="alerts-page-title">Centro de Alertas</h1>
        <p className="alerts-page-subtitle">
          Alertas cuando una cámara <strong>activa</strong> muestra una <strong>persona</strong>{' '}
          reconocida por modelo visual (COCO SSD). No se alerta por simple movimiento, insectos ni
          animales salvo que el modelo los confunda con una persona.
        </p>
      </header>

      <section className="alerts-summary" aria-label="Resumen de alertas">
        <article className="alerts-summary-card">
          <div className="alerts-summary-icon alerts-summary-icon--orange">
            <IconWarningTriangle />
          </div>
          <div>
            <p className="alerts-summary-label">Abiertas</p>
            <p className="alerts-summary-value">{isLoading ? '—' : summary.open}</p>
          </div>
        </article>
        <article className="alerts-summary-card">
          <div className="alerts-summary-icon alerts-summary-icon--blue">
            <IconClock />
          </div>
          <div>
            <p className="alerts-summary-label">En revisión</p>
            <p className="alerts-summary-value">{isLoading ? '—' : summary.ack}</p>
          </div>
        </article>
        <article className="alerts-summary-card">
          <div className="alerts-summary-icon alerts-summary-icon--green">
            <IconCheck />
          </div>
          <div>
            <p className="alerts-summary-label">Resueltas</p>
            <p className="alerts-summary-value">{isLoading ? '—' : summary.resolved}</p>
          </div>
        </article>
        <article className="alerts-summary-card">
          <div className="alerts-summary-icon alerts-summary-icon--red">
            <IconX />
          </div>
          <div>
            <p className="alerts-summary-label">Hoy</p>
            <p className="alerts-summary-value">{isLoading ? '—' : summary.today}</p>
          </div>
        </article>
      </section>

      <section className="alerts-active-section" aria-labelledby="alerts-active-title">
        <h2 id="alerts-active-title" className="alerts-section-label">
          Alertas activas
        </h2>
        {isLoading ? (
          <p className="alerts-empty-msg">Cargando alertas…</p>
        ) : !active ? (
          <p className="alerts-empty-msg">
            No hay alertas abiertas. Si las cámaras están activas y el monitor ML está encendido,
            las detecciones de persona aparecerán aquí automáticamente.
          </p>
        ) : (
          <article className="alerts-active-card">
            <AlertsActiveMediaPanel alert={active} locationLabel={cameraLabel(active)} />

            <div className="alerts-active-main">
              <div className="alerts-active-heading-row">
                <IconWarningTriangle className="alerts-title-warn-icon" />
                <h3 className="alerts-active-title">{alertTitle(active)}</h3>
              </div>
              <p className="alerts-active-time">{formatDateTime(active.createdAt)}</p>
              <p className="alerts-active-desc">{active.message}</p>

              <div className="alerts-detail-grid">
                <div className="alerts-detail-cell">
                  <span className="alerts-detail-label">Tipo</span>
                  <span className="alerts-detail-value">{active.type}</span>
                </div>
                <div className="alerts-detail-cell">
                  <span className="alerts-detail-label">Cámara / zona</span>
                  <span className="alerts-detail-value">{cameraLabel(active)}</span>
                </div>
                <div className="alerts-detail-cell">
                  <span className="alerts-detail-label">Estado</span>
                  <span className="alerts-detail-value">{active.status}</span>
                </div>
              </div>
            </div>

            <div className="alerts-active-aside">
              <div className="alerts-action-stack">
                <button
                  type="button"
                  className="alerts-btn alerts-btn--dark"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ id: active.id, status: 'ACKNOWLEDGED' })
                  }
                >
                  <IconEye />
                  Marcar en revisión
                </button>
                {onRegisterContact ? (
                  <button
                    type="button"
                    className="alerts-btn alerts-btn--green"
                    onClick={onRegisterContact}
                  >
                    <IconUserPlus />
                    Registrar contacto
                  </button>
                ) : null}
                <button
                  type="button"
                  className="alerts-btn alerts-btn--red"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ id: active.id, status: 'RESOLVED' })
                  }
                >
                  <IconX />
                  Resolver alerta
                </button>
              </div>
            </div>
          </article>
        )}
      </section>

      <section className="alerts-history-section" aria-labelledby="alerts-history-title">
        <div className="alerts-history-card">
          <nav className="alerts-history-filters" aria-label="Filtrar historial">
            <button
              type="button"
              className={`alerts-filter-pill${historyFilter === 'all' ? ' alerts-filter-pill--active' : ''}`}
              onClick={() => setHistoryFilter('all')}
            >
              Todas
            </button>
            <button
              type="button"
              className={`alerts-filter-pill${historyFilter === 'camera' ? ' alerts-filter-pill--active' : ''}`}
              onClick={() => setHistoryFilter('camera')}
            >
              Cámara (mov. / persona)
            </button>
            <button
              type="button"
              className={`alerts-filter-pill${historyFilter === 'access' ? ' alerts-filter-pill--active' : ''}`}
              onClick={() => setHistoryFilter('access')}
            >
              Acceso no autorizado
            </button>
          </nav>
          <header className="alerts-history-header">
            <h2 id="alerts-history-title" className="alerts-history-title">
              Historial de alertas
            </h2>
            <p className="alerts-history-subtitle">
              Registro reciente (se actualiza cada pocos segundos)
            </p>
          </header>
          <div className="alerts-history-body" role="region" aria-label="Lista de historial">
            {isLoading ? (
              <p className="alerts-empty-msg">Cargando…</p>
            ) : filteredHistory.length === 0 ? (
              <p className="alerts-empty-msg">No hay alertas en este filtro.</p>
            ) : (
              <ul className="alerts-history-list">
                {filteredHistory.map((a) => {
                  const rowCaptureUrl = alertCaptureDataUrl(a);
                  return (
                  <li key={a.id} className="alerts-history-row">
                    <div className="alerts-history-row-main">
                      {rowCaptureUrl ? (
                        <img
                          className="alerts-history-thumb"
                          src={rowCaptureUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : null}
                      <span className="alerts-history-badge">{alertTag(a)}</span>
                      <div>
                        <p className="alerts-history-row-title">{alertTitle(a)}</p>
                        <p className="alerts-history-row-meta">
                          {formatDateTime(a.createdAt)} · {cameraLabel(a)} ·{' '}
                          <strong>{a.status}</strong>
                        </p>
                        <p className="alerts-history-row-msg">{a.message}</p>
                      </div>
                    </div>
                    {a.status === 'OPEN' ? (
                      <div className="alerts-history-row-actions">
                        <button
                          type="button"
                          className="alerts-history-mini-btn"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({ id: a.id, status: 'ACKNOWLEDGED' })
                          }
                        >
                          Revisar
                        </button>
                        <button
                          type="button"
                          className="alerts-history-mini-btn alerts-history-mini-btn--primary"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({ id: a.id, status: 'RESOLVED' })
                          }
                        >
                          Resolver
                        </button>
                      </div>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
