import { useEventsQuery } from './api';

export function EventsView() {
  const { data, isLoading } = useEventsQuery();

  return (
    <div className="ui-panel">
      {isLoading ? (
        <p className="ui-muted">Cargando…</p>
      ) : (
        <ul className="ui-list">
          {data?.map((event) => (
            <li key={event.id} className="ui-list-item">
              <strong>{event.type}</strong> · {event.cameraId} ·{' '}
              {new Date(event.detectedAt).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

