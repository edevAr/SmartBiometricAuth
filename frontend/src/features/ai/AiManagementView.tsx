import { useState } from 'react';
import { CamerasView } from '../cameras/CamerasView';
import { EventsView } from '../events/EventsView';

type AiSubTab = 'history' | 'detections' | 'settings';

function IconRefresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const TRAINING_ROWS = [
  {
    id: '1',
    model: 'Reconocimiento Facial',
    samples: '12 muestras',
    date: '16 Mar 2026, 10:30',
    precision: '98.5%',
    duration: '15 min',
  },
  {
    id: '2',
    model: 'Reconocimiento de Voz',
    samples: '8 muestras',
    date: '15 Mar 2026, 14:20',
    precision: '95.2%',
    duration: '12 min',
  },
  {
    id: '3',
    model: 'Ambos Modelos',
    samples: '20 muestras',
    date: '14 Mar 2026, 09:00',
    precision: '97.1%',
    duration: '22 min',
  },
];

export function AiManagementView() {
  const [subTab, setSubTab] = useState<AiSubTab>('history');

  return (
    <div className="ai-page">
      <header className="ai-page-head">
        <div>
          <h1 className="ai-page-title">Gestión del Motor de IA</h1>
          <p className="ai-page-subtitle">
            Administre y monitoree el sistema de reconocimiento inteligente.
          </p>
        </div>
        <button type="button" className="ai-btn-retrain">
          <IconRefresh />
          Reentrenar Modelo
        </button>
      </header>

      <section className="ai-model-grid" aria-label="Resumen de modelos">
        <article className="ai-model-card">
          <div className="ai-model-card-top">
            <div className="ai-model-icon-wrap ai-model-icon-wrap--blue">
              <IconCamera />
            </div>
            <div className="ai-model-heading">
              <h2 className="ai-model-title">Reconocimiento Facial</h2>
              <p className="ai-model-desc">Modelo de análisis facial.</p>
            </div>
            <span className="ai-status-pill">Óptimo</span>
          </div>
          <div className="ai-precision-block">
            <div className="ai-precision-row">
              <span className="ai-precision-value">98.5%</span>
            </div>
            <div className="ai-bar-track">
              <div className="ai-bar-fill" style={{ width: '98.5%' }} />
            </div>
          </div>
          <div className="ai-model-stats-row">
            <span>
              Muestras Entrenadas: <strong>156</strong>
            </span>
            <span>
              Última Actualización: <strong>Hace 2 horas</strong>
            </span>
          </div>
          <p className="ai-model-footer">
            <IconCheckCircle />
            Modelo optimizado y funcionando.
          </p>
        </article>

        <article className="ai-model-card">
          <div className="ai-model-card-top">
            <div className="ai-model-icon-wrap ai-model-icon-wrap--purple">
              <IconMic />
            </div>
            <div className="ai-model-heading">
              <h2 className="ai-model-title">Reconocimiento de Voz</h2>
              <p className="ai-model-desc">Modelo de análisis de audio.</p>
            </div>
            <span className="ai-status-pill ai-status-pill--good">Bueno</span>
          </div>
          <div className="ai-precision-block">
            <div className="ai-precision-row">
              <span className="ai-precision-value">95.2%</span>
            </div>
            <div className="ai-bar-track">
              <div className="ai-bar-fill" style={{ width: '95.2%' }} />
            </div>
          </div>
          <div className="ai-model-stats-row">
            <span>
              Muestras Entrenadas: <strong>142</strong>
            </span>
            <span>
              Última Actualización: <strong>Hace 3 horas</strong>
            </span>
          </div>
          <p className="ai-model-footer">
            <IconCheckCircle />
            Modelo optimizado y funcionando.
          </p>
        </article>
      </section>

      <nav className="ai-subtabs" aria-label="Secciones de IA">
        <button
          type="button"
          className={`ai-subtab${subTab === 'history' ? ' ai-subtab--active' : ''}`}
          onClick={() => setSubTab('history')}
        >
          Historial de Entrenamiento
        </button>
        <button
          type="button"
          className={`ai-subtab${subTab === 'detections' ? ' ai-subtab--active' : ''}`}
          onClick={() => setSubTab('detections')}
        >
          Registro de Detecciones
        </button>
        <button
          type="button"
          className={`ai-subtab${subTab === 'settings' ? ' ai-subtab--active' : ''}`}
          onClick={() => setSubTab('settings')}
        >
          Configuración
        </button>
      </nav>

      {subTab === 'history' && (
        <section className="ai-panel-card" aria-labelledby="ai-history-title">
          <header className="ai-panel-header">
            <h2 id="ai-history-title" className="ai-panel-title">
              Historial de Entrenamiento
            </h2>
            <p className="ai-panel-subtitle">
              Registro de sesiones de entrenamiento del modelo de IA.
            </p>
          </header>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th scope="col">Modelo</th>
                  <th scope="col">Muestras</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Precisión</th>
                  <th scope="col">Duración</th>
                </tr>
              </thead>
              <tbody>
                {TRAINING_ROWS.map((row) => (
                  <tr key={row.id}>
                    <td>{row.model}</td>
                    <td>
                      <span className="ai-table-badge">{row.samples}</span>
                    </td>
                    <td className="ai-table-muted">{row.date}</td>
                    <td>
                      <span className="ai-table-precision">{row.precision}</span>
                    </td>
                    <td>
                      <strong>{row.duration}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {subTab === 'detections' && (
        <section className="ai-panel-card" aria-labelledby="ai-detections-title">
          <header className="ai-panel-header">
            <h2 id="ai-detections-title" className="ai-panel-title">
              Registro de Detecciones
            </h2>
            <p className="ai-panel-subtitle">
              Eventos recientes capturados por el sistema de reconocimiento.
            </p>
          </header>
          <div className="ai-detections-embed">
            <EventsView />
          </div>
        </section>
      )}

      {subTab === 'settings' && (
        <section className="ai-panel-card" aria-labelledby="ai-settings-title">
          <header className="ai-panel-header">
            <h2 id="ai-settings-title" className="ai-panel-title">
              Configuración
            </h2>
            <p className="ai-panel-subtitle">
              Cámaras y parámetros conectados al motor de IA.
            </p>
          </header>
          <div className="ai-settings-embed">
            <CamerasView />
          </div>
        </section>
      )}
    </div>
  );
}
