import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';

type OsmLocationPickerProps = {
  /** Latitud inicial (null = centro por defecto en México aprox.) */
  initialLat: number | null;
  initialLng: number | null;
  onPositionChange: (lat: number, lng: number) => void;
  height?: number;
};

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];

function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

/**
 * Mapa interactivo con teselas **OpenStreetMap** (Leaflet).
 * Clic en el mapa o arrastre del marcador actualiza lat/lng.
 * Se inicializa una sola vez por montaje del componente (use `key` en el padre para reiniciar).
 */
export function OsmLocationPicker({
  initialLat,
  initialLng,
  onPositionChange,
  height = 220,
}: OsmLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const onPosRef = useRef(onPositionChange);
  onPosRef.current = onPositionChange;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ilat = initialLat;
    const ilng = initialLng;

    fixLeafletIcons();

    const hasPoint =
      ilat != null && ilng != null && Number.isFinite(ilat) && Number.isFinite(ilng);
    const center: [number, number] = hasPoint ? [ilat!, ilng!] : DEFAULT_CENTER;
    const zoom = hasPoint ? 16 : 5;

    const map = L.map(el).setView(center, zoom);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker(center, { draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onPosRef.current(p.lat, p.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onPosRef.current(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // Valores iniciales solo al montar; el padre fuerza remontaje con `key` si hace falta.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario arriba
  }, []);

  return (
    <div className="osm-picker-wrap">
      <p className="osm-picker-hint">
        Mapa OpenStreetMap: pulse en el mapa o arrastre el marcador para fijar su ubicación.
      </p>
      <div ref={containerRef} className="osm-picker-map" style={{ height }} />
    </div>
  );
}
