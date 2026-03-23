import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import axios from 'axios';
import { useContactsQuery } from '../contacts/api';
import type { Contact } from '../contacts/api';
import {
  useCamerasQuery,
  useRegisterCameraMutation,
  useUpdateCameraMutation,
} from '../cameras/api';
import { CameraLivePreview } from '../cameras/CameraLivePreview';
import { useEventsQuery } from '../events/api';
import type { EventItem } from '../events/api';

type ActivityVariant = 'ok' | 'err' | 'neutral';

type ActivityRow = {
  id: string;
  initials: string;
  name: string;
  detail: string;
  time: string;
  badge: string;
  variant: ActivityVariant;
  avatarClass: string;
};

function IconCameraSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const FALLBACK_ACTIVITY: ActivityRow[] = [
  {
    id: 'demo-1',
    initials: 'MG',
    name: 'María González',
    detail: 'Acceso autorizado',
    time: 'Hace 15 min',
    badge: 'Autorizado',
    variant: 'ok',
    avatarClass: 'dash-act-avatar--green',
  },
  {
    id: 'demo-2',
    initials: '?',
    name: 'Persona Desconocida',
    detail: 'Intento de acceso - Rechazado',
    time: 'Hace 1 hora',
    badge: 'Rechazado',
    variant: 'err',
    avatarClass: 'dash-act-avatar--red',
  },
  {
    id: 'demo-3',
    initials: 'CR',
    name: 'Carlos Ruiz',
    detail: 'Acceso autorizado',
    time: 'Hace 2 horas',
    badge: 'Autorizado',
    variant: 'ok',
    avatarClass: 'dash-act-avatar--teal',
  },
  {
    id: 'demo-4',
    initials: 'AM',
    name: 'Ana Martínez',
    detail: 'Nuevo contacto registrado',
    time: 'Hace 5 horas',
    badge: 'Nuevo',
    variant: 'neutral',
    avatarClass: 'dash-act-avatar--blue',
  },
];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeTimeEs(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

function eventToActivity(
  event: EventItem,
  contactById: Map<string, Contact>,
): ActivityRow {
  const contact = event.contactId ? contactById.get(event.contactId) : undefined;
  const name = contact?.name;

  if (event.type === 'KNOWN_VISITOR') {
    const displayName = name ?? 'Visitante conocido';
    return {
      id: event.id,
      initials: initialsFrom(displayName),
      name: displayName,
      detail: 'Acceso autorizado',
      time: formatRelativeTimeEs(event.detectedAt),
      badge: 'Autorizado',
      variant: 'ok',
      avatarClass: 'dash-act-avatar--green',
    };
  }
  if (event.type === 'UNKNOWN_VISITOR') {
    return {
      id: event.id,
      initials: '?',
      name: 'Persona Desconocida',
      detail: 'Intento de acceso - Rechazado',
      time: formatRelativeTimeEs(event.detectedAt),
      badge: 'Rechazado',
      variant: 'err',
      avatarClass: 'dash-act-avatar--red',
    };
  }
  if (event.type === 'INTRUDER_ALERT') {
    return {
      id: event.id,
      initials: '!',
      name: 'Alerta de intrusión',
      detail: 'Detección en cámara',
      time: formatRelativeTimeEs(event.detectedAt),
      badge: 'Crítico',
      variant: 'err',
      avatarClass: 'dash-act-avatar--red',
    };
  }
  if (event.type === 'MOTION_DETECTED') {
    return {
      id: event.id,
      initials: 'M',
      name: 'Movimiento en cámara',
      detail: 'Cambio detectado en la imagen',
      time: formatRelativeTimeEs(event.detectedAt),
      badge: 'Movimiento',
      variant: 'neutral',
      avatarClass: 'dash-act-avatar--teal',
    };
  }
  if (event.type === 'PERSON_DETECTED') {
    return {
      id: event.id,
      initials: 'P',
      name: 'Posible persona',
      detail: 'Cambio visual importante en cámara',
      time: formatRelativeTimeEs(event.detectedAt),
      badge: 'Persona',
      variant: 'err',
      avatarClass: 'dash-act-avatar--red',
    };
  }
  return {
    id: event.id,
    initials: '•',
    name: name ?? 'Evento',
    detail: event.type,
    time: formatRelativeTimeEs(event.detectedAt),
    badge: 'Info',
    variant: 'neutral',
    avatarClass: 'dash-act-avatar--blue',
  };
}

function countContactsThisMonth(contacts: Contact[] | undefined): number {
  if (!contacts?.length) return 0;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return contacts.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

function countEventsToday(events: EventItem[] | undefined): number {
  if (!events?.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter((e) => new Date(e.detectedAt) >= today).length;
}

function yesterdayEventCount(events: EventItem[] | undefined): number {
  if (!events?.length) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return events.filter((e) => {
    const t = new Date(e.detectedAt);
    return t >= start && t < end;
  }).length;
}

function cameraErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const raw = (err.response?.data as { message?: unknown })?.message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw)) return raw.join(', ');
  return fallback;
}

export function DashboardHomeView() {
  const { data: contacts, isLoading: loadingContacts } = useContactsQuery();
  const { data: cameras, isLoading: loadingCameras } = useCamerasQuery();
  const { data: events, isLoading: loadingEvents } = useEventsQuery();
  const registerCameraMutation = useRegisterCameraMutation();
  const updateCameraMutation = useUpdateCameraMutation();
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editCameraId, setEditCameraId] = useState<string | null>(null);
  const [liveCameraId, setLiveCameraId] = useState<string | null>(null);
  const [liveCameraName, setLiveCameraName] = useState('');
  const [camForm, setCamForm] = useState({
    ipAddress: '',
    username: '',
    password: '',
    port: '80',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    ipAddress: '',
    port: '80',
    username: '',
    password: '',
    rtspPath: '/stream1',
    location: '',
    isActive: true,
  });
  const [cameraRegError, setCameraRegError] = useState<string | null>(null);
  const [cameraEditError, setCameraEditError] = useState<string | null>(null);

  const contactById = useMemo(() => {
    const m = new Map<string, Contact>();
    contacts?.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const activityRows = useMemo(() => {
    if (!events?.length) return FALLBACK_ACTIVITY;
    const fromApi = events.slice(0, 5).map((e) => eventToActivity(e, contactById));
    return fromApi.length >= 4 ? fromApi.slice(0, 4) : [...fromApi, ...FALLBACK_ACTIVITY].slice(0, 4);
  }, [events, contactById]);

  const contactCount = contacts?.length ?? 0;
  const addedThisMonth = countContactsThisMonth(contacts);
  const cameraTotal = cameras?.length ?? 0;
  const cameraActive = cameras?.filter((c) => c.isActive).length ?? 0;
  const alertsToday = countEventsToday(events);
  const alertsYesterday = yesterdayEventCount(events);
  const alertDelta = alertsToday - alertsYesterday;

  const loading = loadingContacts || loadingCameras || loadingEvents;

  const cameraStatusCards = useMemo(() => {
    if (!cameras?.length) return [];
    const latestByCamera = new Map<string, EventItem>();
    events?.forEach((e) => {
      const prev = latestByCamera.get(e.cameraId);
      if (!prev || new Date(e.detectedAt) > new Date(prev.detectedAt)) {
        latestByCamera.set(e.cameraId, e);
      }
    });
    return cameras.slice(0, 8).map((cam) => {
      const latest = latestByCamera.get(cam.id);
      const lastLine = latest
        ? formatRelativeTimeEs(latest.detectedAt)
        : 'Sin actividad reciente';
      return {
        id: cam.id,
        name: (cam.location?.trim() || cam.name) ?? cam.ipAddress,
        lastDetection: lastLine,
        active: cam.isActive,
      };
    });
  }, [cameras, events]);

  const openEditCamera = (camId: string) => {
    const c = cameras?.find((x) => x.id === camId);
    if (!c) return;
    setCameraModalOpen(false);
    setCameraEditError(null);
    setEditCameraId(camId);
    setEditForm({
      name: c.name,
      ipAddress: c.ipAddress,
      port: String(c.port),
      username: c.username,
      password: '',
      rtspPath: c.rtspPath || '/stream1',
      location: c.location ?? '',
      isActive: c.isActive,
    });
  };

  const handleEditCameraSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editCameraId) return;
    setCameraEditError(null);
    if (!editForm.ipAddress.trim() || !editForm.username.trim()) {
      setCameraEditError('IP y usuario son obligatorios.');
      return;
    }
    updateCameraMutation.mutate(
      {
        id: editCameraId,
        name: editForm.name.trim() || undefined,
        ipAddress: editForm.ipAddress.trim(),
        port: editForm.port.trim() || '80',
        username: editForm.username.trim(),
        rtspPath: editForm.rtspPath.trim() || '/stream1',
        location: editForm.location.trim(),
        isActive: editForm.isActive,
        ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
      },
      {
        onSuccess: () => {
          setEditCameraId(null);
        },
        onError: (err: unknown) => {
          setCameraEditError(
            cameraErrorMessage(err, 'No se pudo guardar la configuración.'),
          );
        },
      },
    );
  };

  const handleCameraModalSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCameraRegError(null);
    if (!camForm.ipAddress.trim() || !camForm.username.trim() || !camForm.password) {
      setCameraRegError('Complete IP, usuario y contraseña.');
      return;
    }
    registerCameraMutation.mutate(
      {
        ipAddress: camForm.ipAddress.trim(),
        username: camForm.username.trim(),
        password: camForm.password,
        port: camForm.port.trim() || '80',
      },
      {
        onSuccess: (cam) => {
          setCameraModalOpen(false);
          setCamForm({ ipAddress: '', username: '', password: '', port: '80' });
          setLiveCameraId(cam.id);
          setLiveCameraName(cam.name);
        },
        onError: (err: unknown) => {
          setCameraRegError(
            cameraErrorMessage(err, 'No se pudo registrar la cámara. Revise los datos.'),
          );
        },
      },
    );
  };

  return (
    <>
      <header className="dash-page-head">
        <div>
          <h1 className="dash-page-title">Dashboard</h1>
          <p className="dash-page-subtitle">Visión general del sistema de seguridad</p>
        </div>
        <button
          type="button"
          className="dash-btn-primary"
          onClick={() => {
            setCameraRegError(null);
            setEditCameraId(null);
            setCameraModalOpen(true);
          }}
        >
          + Registrar Cámara
        </button>
      </header>

      <div
        className={
          liveCameraId
            ? 'dash-cameras-live-zone dash-cameras-live-zone--with-live'
            : 'dash-cameras-live-zone'
        }
      >
        <section className="dash-cameras-section" aria-labelledby="dash-cameras-title">
          <header className="dash-cameras-head">
            <h2 id="dash-cameras-title" className="dash-cameras-title">
              Estado de Cámaras
            </h2>
            <p className="dash-cameras-subtitle">
              Monitoreo en tiempo real de todas las cámaras. Pulsa una tarjeta para editar la
              conexión (IP, credenciales, etc.).
            </p>
          </header>
          {cameraStatusCards.length === 0 ? (
            <p className="dash-cameras-empty">
              No hay cámaras registradas. Use «Registrar cámara» para añadir una IP y ver el
              vídeo en esta página.
            </p>
          ) : (
            <ul className="dash-cameras-grid">
              {cameraStatusCards.map((cam) => (
                <li key={cam.id}>
                  <article
                    className={`dash-cam-card dash-cam-card--clickable${liveCameraId === cam.id ? ' dash-cam-card--live-selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Editar configuración de ${cam.name}`}
                    onClick={() => openEditCamera(cam.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEditCamera(cam.id);
                      }
                    }}
                  >
                    <div className="dash-cam-card-top">
                      <div className="dash-cam-icon-box" aria-hidden>
                        <IconCameraSmall />
                      </div>
                      <span
                        className={`dash-cam-status-badge${cam.active ? '' : ' dash-cam-status-badge--off'}`}
                      >
                        {cam.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <h3 className="dash-cam-name">{cam.name}</h3>
                    <p className="dash-cam-last">
                      Última detección: {cam.lastDetection}
                    </p>
                    <button
                      type="button"
                      className="dash-cam-watch-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLiveCameraId(cam.id);
                        setLiveCameraName(cam.name);
                      }}
                    >
                      Ver en vivo
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        {liveCameraId ? (
          <section className="dash-live-camera-section" aria-label="Vista en vivo de la cámara">
            <div className="dash-live-camera-head">
              <div>
                <h2 className="dash-live-camera-heading">Vista en vivo</h2>
                <p className="dash-live-camera-sub">{liveCameraName}</p>
              </div>
              <button
                type="button"
                className="dash-btn-outline-sm"
                onClick={() => {
                  setLiveCameraId(null);
                  setLiveCameraName('');
                }}
              >
                Ocultar vista
              </button>
            </div>
            <CameraLivePreview cameraId={liveCameraId} />
          </section>
        ) : null}
      </div>

      <section className="dash-stats-grid" aria-label="Resumen">
        <article className="dash-stat-card">
          <div className="dash-stat-card-inner">
            <div>
              <p className="dash-stat-label">Contactos Registrados</p>
              <p className="dash-stat-value">
                {loading ? '—' : contactCount}
              </p>
              <p className="dash-stat-trend dash-stat-trend--up">
                <span className="dash-stat-trend-icon" aria-hidden>
                  ↑
                </span>
                {addedThisMonth === 1
                  ? '+1 este mes'
                  : `+${addedThisMonth} este mes`}
              </p>
            </div>
            <div className="dash-stat-icon-wrap dash-stat-icon-wrap--blue" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 8v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-card-inner">
            <div>
              <p className="dash-stat-label">Estado del Sistema</p>
              <p className="dash-stat-value">Activo</p>
              <p className="dash-stat-trend dash-stat-trend--pulse">
                <span className="dash-pulse-dot" aria-hidden />
                99.8% uptime
              </p>
            </div>
            <div className="dash-stat-icon-wrap dash-stat-icon-wrap--green" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-card-inner">
            <div>
              <p className="dash-stat-label">Cámaras Conectadas</p>
              <p className="dash-stat-value">
                {loading ? '—' : `${cameraActive}/${cameraTotal}`}
              </p>
              <p className="dash-stat-trend dash-stat-trend--muted">
                {cameraTotal === 0
                  ? 'Sin cámaras registradas'
                  : cameraActive === cameraTotal
                    ? 'Todas operativas'
                    : `${cameraTotal - cameraActive} sin conexión`}
              </p>
            </div>
            <div className="dash-stat-icon-wrap dash-stat-icon-wrap--purple" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-card-inner">
            <div>
              <p className="dash-stat-label">Alertas Hoy</p>
              <p className="dash-stat-value">{loading ? '—' : alertsToday}</p>
              <p
                className={`dash-stat-trend ${alertDelta <= 0 ? 'dash-stat-trend--down' : 'dash-stat-trend--warn'}`}
              >
                <span className="dash-stat-trend-icon" aria-hidden>
                  {alertDelta <= 0 ? '↓' : '↑'}
                </span>
                {alertDelta === 0
                  ? 'Igual que ayer'
                  : `${alertDelta > 0 ? '+' : ''}${alertDelta} vs ayer`}
              </p>
            </div>
            <div className="dash-stat-icon-wrap dash-stat-icon-wrap--orange" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </article>
      </section>

      <div className="dash-columns">
        <section className="dash-card dash-card--activity" aria-labelledby="actividad-title">
          <div className="dash-card-header">
            <h2 id="actividad-title" className="dash-card-title">
              Actividad Reciente
            </h2>
            <p className="dash-card-subtitle">Últimos eventos del sistema de seguridad.</p>
          </div>
          <ul className="dash-activity-list">
            {activityRows.map((row) => (
              <li key={row.id} className="dash-activity-row">
                <div className={`dash-act-avatar ${row.avatarClass}`}>{row.initials}</div>
                <div className="dash-act-body">
                  <div className="dash-act-top">
                    <span className="dash-act-name">{row.name}</span>
                    <span className="dash-act-time">{row.time}</span>
                  </div>
                  <p className="dash-act-detail">{row.detail}</p>
                </div>
                <span className={`dash-badge dash-badge--${row.variant}`}>{row.badge}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="dash-card dash-card--ai" aria-labelledby="ia-title">
          <div className="dash-card-header">
            <h2 id="ia-title" className="dash-card-title">
              Estado de Entrenamiento IA
            </h2>
            <p className="dash-card-subtitle">Modelo de reconocimiento facial y de voz.</p>
          </div>
          <div className="dash-ai-metrics">
            <div className="dash-progress-block">
              <div className="dash-progress-head">
                <span>Reconocimiento Facial</span>
                <strong>98%</strong>
              </div>
              <div className="dash-progress-track">
                <div className="dash-progress-fill" style={{ width: '98%' }} />
              </div>
              <p className="dash-progress-caption">
                {contactCount === 0
                  ? '12 rostros entrenados'
                  : contactCount === 1
                    ? '1 rostro entrenado'
                    : `${contactCount} rostros entrenados`}
              </p>
            </div>
            <div className="dash-progress-block">
              <div className="dash-progress-head">
                <span>Reconocimiento de Voz</span>
                <strong>95%</strong>
              </div>
              <div className="dash-progress-track">
                <div className="dash-progress-fill" style={{ width: '95%' }} />
              </div>
              <p className="dash-progress-caption">
                {contactCount === 0
                  ? '12 voces entrenadas'
                  : contactCount === 1
                    ? '1 voz entrenada'
                    : `${contactCount} voces entrenadas`}
              </p>
            </div>
            <div className="dash-progress-block">
              <div className="dash-progress-head">
                <span>Precisión General</span>
                <strong>96.5%</strong>
              </div>
              <div className="dash-progress-track">
                <div className="dash-progress-fill dash-progress-fill--accent" style={{ width: '96.5%' }} />
              </div>
              <p className="dash-progress-caption">Última actualización: Hoy</p>
            </div>
          </div>
          <button type="button" className="dash-btn-outline-full">
            Reentrenar Modelo
          </button>
        </section>
      </div>

      {cameraModalOpen ? (
        <div
          className="contacts-modal-backdrop"
          role="presentation"
          onClick={() => setCameraModalOpen(false)}
        >
          <div
            className="contacts-modal"
            role="dialog"
            aria-labelledby="dash-cam-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dash-cam-modal-title" className="contacts-modal-title">
              Registrar cámara IP
            </h2>
            <p className="dash-cam-modal-intro">
              Introduzca los datos de acceso HTTP de la cámara. El servidor intentará obtener un
              fotograma en vivo (varias rutas habituales). Puerto por defecto: 80.
            </p>
            <form className="contacts-modal-form" onSubmit={handleCameraModalSubmit}>
              <label className="contacts-modal-field">
                <span>Dirección IP</span>
                <input
                  className="contacts-modal-input"
                  placeholder="192.168.1.100"
                  value={camForm.ipAddress}
                  onChange={(e) => setCamForm({ ...camForm, ipAddress: e.target.value })}
                  required
                  autoComplete="off"
                />
              </label>
              <label className="contacts-modal-field">
                <span>Puerto HTTP (opcional)</span>
                <input
                  className="contacts-modal-input"
                  placeholder="80"
                  value={camForm.port}
                  onChange={(e) => setCamForm({ ...camForm, port: e.target.value })}
                  inputMode="numeric"
                />
              </label>
              <label className="contacts-modal-field">
                <span>Usuario</span>
                <input
                  className="contacts-modal-input"
                  autoComplete="username"
                  value={camForm.username}
                  onChange={(e) => setCamForm({ ...camForm, username: e.target.value })}
                  required
                />
              </label>
              <label className="contacts-modal-field">
                <span>Contraseña</span>
                <input
                  className="contacts-modal-input"
                  type="password"
                  autoComplete="current-password"
                  value={camForm.password}
                  onChange={(e) => setCamForm({ ...camForm, password: e.target.value })}
                  required
                />
              </label>
              {cameraRegError ? (
                <p className="dash-cam-modal-error" role="alert">
                  {cameraRegError}
                </p>
              ) : null}
              <div className="contacts-modal-actions">
                <button
                  type="button"
                  className="contacts-modal-cancel"
                  onClick={() => setCameraModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="contacts-modal-submit"
                  disabled={registerCameraMutation.isPending}
                >
                  {registerCameraMutation.isPending ? 'Guardando…' : 'Aceptar y conectar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editCameraId ? (
        <div
          className="contacts-modal-backdrop"
          role="presentation"
          onClick={() => setEditCameraId(null)}
        >
          <div
            className="contacts-modal contacts-modal--camera-edit"
            role="dialog"
            aria-labelledby="dash-cam-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dash-cam-edit-title" className="contacts-modal-title">
              Editar conexión de la cámara
            </h2>
            <p className="dash-cam-modal-intro">
              Modifique IP, puerto HTTP, usuario o rutas. Deje la contraseña en blanco para conservar la
              actual.
            </p>
            <form className="contacts-modal-form" onSubmit={handleEditCameraSubmit}>
              <label className="contacts-modal-field">
                <span>Nombre</span>
                <input
                  className="contacts-modal-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  autoComplete="off"
                />
              </label>
              <label className="contacts-modal-field">
                <span>Dirección IP</span>
                <input
                  className="contacts-modal-input"
                  value={editForm.ipAddress}
                  onChange={(e) => setEditForm({ ...editForm, ipAddress: e.target.value })}
                  required
                  autoComplete="off"
                />
              </label>
              <label className="contacts-modal-field">
                <span>Puerto HTTP</span>
                <input
                  className="contacts-modal-input"
                  value={editForm.port}
                  onChange={(e) => setEditForm({ ...editForm, port: e.target.value })}
                  inputMode="numeric"
                />
              </label>
              <label className="contacts-modal-field">
                <span>Usuario</span>
                <input
                  className="contacts-modal-input"
                  autoComplete="username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                />
              </label>
              <label className="contacts-modal-field">
                <span>Nueva contraseña (opcional)</span>
                <input
                  className="contacts-modal-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Vacío = no cambiar"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </label>
              <label className="contacts-modal-field">
                <span>Ruta RTSP</span>
                <input
                  className="contacts-modal-input"
                  value={editForm.rtspPath}
                  onChange={(e) => setEditForm({ ...editForm, rtspPath: e.target.value })}
                  autoComplete="off"
                />
              </label>
              <label className="contacts-modal-field">
                <span>Ubicación / zona</span>
                <input
                  className="contacts-modal-input"
                  placeholder="Ej. Entrada principal"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  autoComplete="off"
                />
              </label>
              <label className="contacts-modal-field contacts-modal-field--row">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                />
                <span>Cámara activa</span>
              </label>
              {cameraEditError ? (
                <p className="dash-cam-modal-error" role="alert">
                  {cameraEditError}
                </p>
              ) : null}
              <div className="contacts-modal-actions">
                <button
                  type="button"
                  className="contacts-modal-cancel"
                  onClick={() => setEditCameraId(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="contacts-modal-submit"
                  disabled={updateCameraMutation.isPending}
                >
                  {updateCameraMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
