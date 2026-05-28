import { useMemo } from 'react';
import { emergencyLocationFromSearch } from './emergencyLocationFromSearch';
import './emergency-location.css';

/**
 * Página pública (sin login) enlazada desde el correo de alerta por intruso.
 * Query: ?emergency=1&lat=&lng=&address=&owner=
 */
export function EmergencyLocationPage() {
  const { address, owner, osmLink, embedSrc, showNoLocationWarning } = useMemo(
    () => emergencyLocationFromSearch(typeof window !== 'undefined' ? window.location.search : ''),
    [],
  );

  return (
    <div className="emergency-page">
      <header className="emergency-page__head">
        <h1 className="emergency-page__title">Ubicación — solicitud de ayuda</h1>
        <p className="emergency-page__subtitle">
          Esta página fue abierta desde un aviso de seguridad del hogar.
        </p>
      </header>

      <section className="emergency-page__card">
        {owner ? (
          <p className="emergency-page__line">
            <strong>Quien envía el aviso:</strong> {owner}
          </p>
        ) : null}
        {address ? (
          <p className="emergency-page__line">
            <strong>Dirección indicada:</strong> {address}
          </p>
        ) : showNoLocationWarning ? (
          <p className="emergency-page__warn">
            No se incluyó dirección ni coordenadas en el enlace. Contacta por otros medios a la
            persona que te envió el correo.
          </p>
        ) : null}

        {embedSrc ? (
          <div className="emergency-page__map-wrap">
            <iframe
              title="Mapa de la ubicación"
              className="emergency-page__map"
              src={embedSrc}
              loading="lazy"
            />
          </div>
        ) : null}

        {osmLink ? (
          <p className="emergency-page__actions">
            <a className="emergency-page__btn" href={osmLink} target="_blank" rel="noreferrer">
              Abrir ubicación en OpenStreetMap (pantalla completa)
            </a>
          </p>
        ) : null}
      </section>

      <p className="emergency-page__foot">SecureHome AI — aviso de emergencia</p>
    </div>
  );
}
