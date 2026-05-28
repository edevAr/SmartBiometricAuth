import { useEffect, useMemo, useState } from 'react';
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

/** Temporizador 2 min (o el configurado en servidor) antes de enviar correo a contactos. */
function PersonAlertEscalationTimer({ alert: a }: { alert: AlertItem }) {
  if (a.type !== 'PERSON_DETECTED' || a.status !== 'OPEN') return null;

  if (a.contactsNotifiedAt) {
    return (
      <div className="alerts-escalation-done" role="status">
        <p className="alerts-escalation-done-title">Contactos notificados</p>
        <p className="alerts-escalation-done-text">
          Se envió un correo a los contactos configurados con tu aviso y ubicación.
        </p>
      </div>
    );
  }

  if (!a.contactsNotifyAt) return null;

  const deadline = new Date(a.contactsNotifyAt).getTime();

  return <PersonAlertEscalationCountdown deadline={deadline} />;
}

function PersonAlertEscalationCountdown({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remaining = Math.max(0, deadline - now);
  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);

  if (remaining <= 0) {
    return (
      <div className="alerts-escalation-pending" role="status">
        <p className="alerts-escalation-pending-label">Tiempo de espera finalizado</p>
        <p className="alerts-escalation-pending-text">
          El sistema está enviando el correo a tus contactos (o ya lo envió). Esta vista se actualiza
          sola en unos segundos.
        </p>
      </div>
    );
  }

  return (
    <div className="alerts-escalation-countdown" role="timer" aria-live="polite">
      <p className="alerts-escalation-countdown-label">
        Si no haces nada, se notificará automáticamente a tus contactos en:
      </p>
      <p className="alerts-escalation-countdown-time">
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </p>
      <p className="alerts-escalation-countdown-hint">
        <strong>Marcar en revisión</strong> o <strong>Resolver</strong> cancela el envío automático
        si ya tienes la situación controlada.
      </p>
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
  /** Si hay valor, el card superior muestra esa alerta del historial; si no, la primera abierta. */
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

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

  const detailAlert = useMemo(() => {
    if (selectedDetailId) {
      return list.find((a) => a.id === selectedDetailId) ?? null;
    }
    return active ?? null;
  }, [list, selectedDetailId, active]);

  useEffect(() => {
    if (selectedDetailId && !list.some((a) => a.id === selectedDetailId)) {
      setSelectedDetailId(null);
    }
  }, [list, selectedDetailId]);

  const filteredHistory = useMemo(() => {
    const sorted = [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (historyFilter === 'camera') return sorted.filter((a) => isCameraVisionType(a.type));
    if (historyFilter === 'access') return sorted.filter((a) => a.type === 'UNAUTHORIZED_ACCESS');
    return sorted;
  }, [list, historyFilter]);

  const cameraLabel = (a: AlertItem) =>
    a.cameraId ? cameraById.get(a.cameraId) ?? a.cameraId.slice(0, 8) + '…' : '—';

  const viewingHistoryDetail =
    Boolean(selectedDetailId) &&
    (active == null || selectedDetailId !== active.id);

  return (
    <div className="alerts-page">
      <header className="alerts-page-head">
        <h1 className="alerts-page-title">Centro de Alertas</h1>
        <p className="alerts-page-subtitle">
          Alertas cuando una cámara <strong>activa</strong> muestra una <strong>persona</strong>{' '}
          reconocida por modelo visual (COCO SSD). Verás un <strong>temporizador</strong>: si no
          actúas, pasado ese tiempo se envía un correo a tus contactos. Puedes cancelar el envío
          marcando la alerta en revisión o resolviéndola.
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
        <div className="alerts-detail-head">
          <h2 id="alerts-active-title" className="alerts-section-label">
            Detalle de alerta
          </h2>
          {viewingHistoryDetail ? (
            <button
              type="button"
              className="alerts-detail-clear-btn"
              onClick={() => setSelectedDetailId(null)}
            >
              {active ? 'Volver a la alerta abierta' : 'Dejar de ver esta alerta'}
            </button>
          ) : null}
        </div>
        {viewingHistoryDetail && detailAlert ? (
          <p className="alerts-detail-hint">
            Viendo una alerta del historial. Pulse otra fila para cambiar o use el botón de arriba
            para volver a la vista por defecto.
          </p>
        ) : null}
        {isLoading ? (
          <p className="alerts-empty-msg">Cargando alertas…</p>
        ) : !detailAlert ? (
          <p className="alerts-empty-msg">
            No hay alerta abierta destacada. Pulse cualquier fila del historial inferior para ver su
            detalle aquí. Si las cámaras están activas y el monitor ML está encendido, las nuevas
            alertas abiertas aparecerán automáticamente.
          </p>
        ) : (
          <article
            className={`alerts-active-card${detailAlert.status !== 'OPEN' ? ' alerts-active-card--muted' : ''}`}
          >
            <AlertsActiveMediaPanel alert={detailAlert} locationLabel={cameraLabel(detailAlert)} />

            <div className="alerts-active-main">
              <div className="alerts-active-heading-row">
                <IconWarningTriangle className="alerts-title-warn-icon" />
                <h3 className="alerts-active-title">{alertTitle(detailAlert)}</h3>
              </div>
              <p className="alerts-active-time">{formatDateTime(detailAlert.createdAt)}</p>
              <p className="alerts-active-desc">{detailAlert.message}</p>

              <PersonAlertEscalationTimer alert={detailAlert} />

              <div className="alerts-detail-grid">
                <div className="alerts-detail-cell">
                  <span className="alerts-detail-label">Tipo</span>
                  <span className="alerts-detail-value">{detailAlert.type}</span>
                </div>
                <div className="alerts-detail-cell">
                  <span className="alerts-detail-label">Cámara / zona</span>
                  <span className="alerts-detail-value">{cameraLabel(detailAlert)}</span>
                </div>
                <div className="alerts-detail-cell">
                  <span className="alerts-detail-label">Estado</span>
                  <span className="alerts-detail-value">{detailAlert.status}</span>
                </div>
              </div>
            </div>

            <div className="alerts-active-aside">
              <div className="alerts-action-stack">
                {detailAlert.status === 'OPEN' ? (
                  <>
                    <button
                      type="button"
                      className="alerts-btn alerts-btn--dark"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({ id: detailAlert.id, status: 'ACKNOWLEDGED' })
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
                        updateMutation.mutate({ id: detailAlert.id, status: 'RESOLVED' })
                      }
                    >
                      <IconX />
                      Resolver alerta
                    </button>
                  </>
                ) : detailAlert.status === 'ACKNOWLEDGED' ? (
                  <button
                    type="button"
                    className="alerts-btn alerts-btn--red"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({ id: detailAlert.id, status: 'RESOLVED' })
                    }
                  >
                    <IconX />
                    Resolver alerta
                  </button>
                ) : (
                  <p className="alerts-detail-closed-note">Esta alerta está resuelta. Solo lectura.</p>
                )}
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
              Registro reciente (se actualiza cada pocos segundos). Pulse una fila para ver el detalle
              arriba.
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
                  const isSelected = selectedDetailId === a.id;
                  return (
                  <li
                    key={a.id}
                    className={`alerts-history-row${isSelected ? ' alerts-history-row--selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="alerts-history-row-select"
                      onClick={() =>
                        setSelectedDetailId((prev) => (prev === a.id ? null : a.id))
                      }
                      aria-pressed={isSelected}
                      aria-label={`Ver detalle: ${alertTitle(a)}`}
                    >
                      <span className="alerts-history-row-main">
                        {rowCaptureUrl ? (
                          <img
                            className="alerts-history-thumb"
                            src={rowCaptureUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : null}
                        <span className="alerts-history-badge">{alertTag(a)}</span>
                        <span className="alerts-history-row-text">
                          <span className="alerts-history-row-title">{alertTitle(a)}</span>
                          <span className="alerts-history-row-meta">
                            {formatDateTime(a.createdAt)} · {cameraLabel(a)} ·{' '}
                            <strong>{a.status}</strong>
                          </span>
                          <span className="alerts-history-row-msg">{a.message}</span>
                        </span>
                      </span>
                    </button>
                    {a.status === 'OPEN' ? (
                      <div className="alerts-history-row-actions">
                        <button
                          type="button"
                          className="alerts-history-mini-btn"
                          disabled={updateMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMutation.mutate({ id: a.id, status: 'ACKNOWLEDGED' });
                          }}
                        >
                          Revisar
                        </button>
                        <button
                          type="button"
                          className="alerts-history-mini-btn alerts-history-mini-btn--primary"
                          disabled={updateMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMutation.mutate({ id: a.id, status: 'RESOLVED' });
                          }}
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
