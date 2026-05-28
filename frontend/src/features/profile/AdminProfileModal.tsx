import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { httpClient } from '../../api/httpClient';
import { mergeSessionUser } from '../../api/sessionUser';
import { OsmLocationPicker } from './OsmLocationPicker';

export type AdminProfile = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  relationship?: string | null;
  role: string;
  isActive: boolean;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type AdminProfileModalProps = {
  open: boolean;
  userId: string | null;
  onClose: () => void;
};

let reverseTimer: ReturnType<typeof setTimeout> | undefined;

async function reverseGeocodeEs(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es',
      'User-Agent': 'SecureHomeAI/1.0 (perfil admin; contacto local)',
    },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { display_name?: string };
  return j.display_name ?? null;
}

export function AdminProfileModal({ open, userId, onClose }: AdminProfileModalProps) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [clearLocation, setClearLocation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Incrementar para volver a montar el mapa (p. ej. tras geolocalización). */
  const [mapLayoutKey, setMapLayoutKey] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-profile', userId],
    queryFn: async () => {
      const { data } = await httpClient.get<AdminProfile>(`/users/${userId}`);
      return data;
    },
    enabled: open && Boolean(userId),
  });

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setEmail(profile.email);
    setPhone(profile.phone ?? '');
    setPassword('');
    setLocationLat(profile.locationLat);
    setLocationLng(profile.locationLng);
    setLocationAddress(profile.locationAddress ?? '');
    setClearLocation(false);
    setFormError(null);
    setGeoError(null);
    setMapLayoutKey(0);
  }, [profile]);

  const debouncedReverseGeocode = useCallback((lat: number, lng: number) => {
    window.clearTimeout(reverseTimer);
    reverseTimer = window.setTimeout(() => {
      void reverseGeocodeEs(lat, lng).then((addr) => {
        if (addr) setLocationAddress(addr);
      });
    }, 900);
  }, []);

  const scheduleReverse = useCallback(
    (lat: number, lng: number) => {
      if (clearLocation) return;
      debouncedReverseGeocode(lat, lng);
    },
    [clearLocation, debouncedReverseGeocode],
  );

  const handleMapChange = useCallback(
    (lat: number, lng: number) => {
      setClearLocation(false);
      setLocationLat(lat);
      setLocationLng(lng);
      scheduleReverse(lat, lng);
    },
    [scheduleReverse],
  );

  const handleUseMyLocation = useCallback(() => {
    setGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tu navegador no ofrece geolocalización.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setGeoError('No se obtuvieron coordenadas válidas.');
          setIsLocating(false);
          return;
        }
        setClearLocation(false);
        setLocationLat(lat);
        setLocationLng(lng);
        setMapLayoutKey((k) => k + 1);
        debouncedReverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        const code = err.code;
        const byCode: Record<number, string> = {
          1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
          2: 'Ubicación no disponible en este momento.',
          3: 'Tiempo agotado al obtener la ubicación. Inténtalo de nuevo.',
        };
        setGeoError(byCode[code] ?? 'No se pudo obtener tu ubicación.');
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  }, [debouncedReverseGeocode]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sin usuario');
      const body: Record<string, unknown> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
      };
      if (password.trim().length > 0) {
        if (password.trim().length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        body.password = password.trim();
      }
      if (clearLocation) {
        body.clearLocation = true;
      } else if (locationLat != null && locationLng != null) {
        body.locationLat = locationLat;
        body.locationLng = locationLng;
        body.locationAddress = locationAddress.trim() || undefined;
      }
      const { data } = await httpClient.patch<AdminProfile>(`/users/${userId}`, body);
      return data;
    },
    onSuccess: (data) => {
      mergeSessionUser({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        locationAddress: data.locationAddress,
      });
      void qc.invalidateQueries({ queryKey: ['admin-profile', userId] });
      void qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e)) {
        const m = e.response?.data as { message?: string | string[] };
        const msg = m?.message;
        setFormError(
          typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : e.message,
        );
      } else if (e instanceof Error) {
        setFormError(e.message);
      } else {
        setFormError('No se pudo guardar');
      }
    },
  });

  if (!open) return null;

  if (!userId) {
    return (
      <div
        className="contacts-modal-backdrop"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="contacts-modal contacts-modal--admin-profile"
          role="dialog"
          aria-labelledby="admin-profile-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="admin-profile-title" className="contacts-modal-title">
            Mi perfil (administrador)
          </h2>
          <p className="alerts-empty-msg">No hay usuario en sesión. Vuelva a iniciar sesión.</p>
          <div className="contacts-modal-actions">
            <button type="button" className="contacts-modal-submit" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="contacts-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="contacts-modal contacts-modal--admin-profile"
        role="dialog"
        aria-labelledby="admin-profile-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-profile-title" className="contacts-modal-title">
          Mi perfil (administrador)
        </h2>
        <p className="admin-profile-intro">
          Datos de su cuenta y ubicación en mapa (teselas{' '}
          <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
          ; geocodificación inversa vía Nominatim).
        </p>

        {isLoading || !profile ? (
          <p className="alerts-empty-msg">Cargando perfil…</p>
        ) : (
          <form
            className="contacts-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              saveMutation.mutate();
            }}
          >
            <label className="contacts-modal-field">
              <span>Nombre completo</span>
              <input
                className="contacts-modal-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                autoComplete="name"
              />
            </label>
            <label className="contacts-modal-field">
              <span>Email</span>
              <input
                className="contacts-modal-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="contacts-modal-field">
              <span>Teléfono (opcional)</span>
              <input
                className="contacts-modal-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="contacts-modal-field">
              <span>Nueva contraseña (opcional)</span>
              <input
                className="contacts-modal-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Dejar vacío para no cambiar"
                minLength={6}
              />
            </label>

            <label className="contacts-modal-field contacts-modal-field--row">
              <input
                type="checkbox"
                checked={clearLocation}
                onChange={(e) => {
                  setClearLocation(e.target.checked);
                  if (e.target.checked) {
                    setLocationLat(null);
                    setLocationLng(null);
                    setLocationAddress('');
                  }
                }}
              />
              <span>Sin ubicación en el mapa (borrar coordenadas guardadas)</span>
            </label>

            {!clearLocation ? (
              <>
                <label className="contacts-modal-field">
                  <span>Dirección / descripción (editable)</span>
                  <input
                    className="contacts-modal-input"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="Se puede rellenar al mover el marcador"
                  />
                </label>
                <div className="admin-profile-geolocate-row">
                  <button
                    type="button"
                    className="admin-profile-geolocate-btn"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual en el mapa'}
                  </button>
                  <span className="admin-profile-geolocate-hint">
                    Usa el GPS del dispositivo; el mapa OpenStreetMap se centrará en ese punto.
                  </span>
                </div>
                {geoError ? (
                  <p className="admin-profile-geo-error" role="alert">
                    {geoError}
                  </p>
                ) : null}
                <OsmLocationPicker
                  key={`${profile.id}-${clearLocation ? 'off' : 'on'}-${mapLayoutKey}`}
                  initialLat={locationLat ?? profile.locationLat}
                  initialLng={locationLng ?? profile.locationLng}
                  onPositionChange={handleMapChange}
                  height={240}
                />
                <p className="admin-profile-coords">
                  {locationLat != null && locationLng != null
                    ? `Lat ${locationLat.toFixed(5)}, Lng ${locationLng.toFixed(5)}`
                    : 'Sin coordenadas: use el mapa o marque «Sin ubicación».'}
                </p>
              </>
            ) : null}

            {formError ? (
              <p className="contacts-modal-error admin-profile-error" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="contacts-modal-actions">
              <button type="button" className="contacts-modal-cancel" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="contacts-modal-submit"
                disabled={saveMutation.isPending}
              >
                Guardar cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
