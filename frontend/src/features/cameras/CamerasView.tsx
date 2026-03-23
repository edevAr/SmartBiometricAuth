import type { FormEvent } from 'react';
import { useState } from 'react';
import { useCamerasQuery, useRegisterCameraMutation } from './api';

type CameraFormFields = {
  name: string;
  ipAddress: string;
  port: string;
  username: string;
  password: string;
  rtspPath: string;
  location: string;
};

export function CamerasView() {
  const { data, isLoading } = useCamerasQuery();
  const registerMutation = useRegisterCameraMutation();
  const [form, setForm] = useState<CameraFormFields>({
    name: '',
    ipAddress: '',
    port: '80',
    username: '',
    password: '',
    rtspPath: '/stream1',
    location: '',
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.ipAddress.trim() || !form.username.trim() || !form.password.trim()) {
      return;
    }
    registerMutation.mutate({
      ...form,
      name: form.name.trim() || undefined,
      port: form.port.trim() || '80',
      rtspPath: form.rtspPath.trim() || undefined,
      location: form.location.trim() || undefined,
    });
  };

  return (
    <div className="ui-panel">
      <form className="ui-form" onSubmit={handleSubmit}>
        <input
          className="ui-input"
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="ui-input"
          placeholder="IP"
          value={form.ipAddress}
          onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
        />
        <input
          className="ui-input"
          placeholder="Puerto"
          value={form.port}
          onChange={(e) => setForm({ ...form, port: e.target.value })}
        />
        <input
          className="ui-input"
          placeholder="Usuario"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="ui-input"
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <input
          className="ui-input"
          placeholder="RTSP /ruta"
          value={form.rtspPath}
          onChange={(e) => setForm({ ...form, rtspPath: e.target.value })}
        />
        <input
          className="ui-input"
          placeholder="Ubicación"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <button
          className="ui-btn"
          type="submit"
          disabled={registerMutation.isPending}
        >
          Registrar
        </button>
      </form>

      {isLoading ? (
        <p className="ui-muted">Cargando…</p>
      ) : (
        <ul className="ui-list">
          {data?.map((camera) => (
            <li key={camera.id} className="ui-list-item">
              <strong>{camera.name}</strong> · {camera.ipAddress}:{camera.port}{' '}
              · {camera.location || '—'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

