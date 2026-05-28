/**
 * Deriva enlaces y flags para la página de emergencia a partir del query string.
 */
export type EmergencyLocationModel = {
  lat: number;
  lng: number;
  hasCoords: boolean;
  address: string;
  owner: string;
  osmLink: string;
  embedSrc: string;
  /** Mostrar aviso cuando no hay dirección ni coordenadas válidas. */
  showNoLocationWarning: boolean;
};

export function emergencyLocationFromSearch(search: string): EmergencyLocationModel {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(q);

  const latRaw = params.get('lat');
  const lngRaw = params.get('lng');
  const lat =
    latRaw != null && latRaw !== '' ? Number(latRaw) : Number.NaN;
  const lng =
    lngRaw != null && lngRaw !== '' ? Number(lngRaw) : Number.NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const address = params.get('address')?.trim() || '';
  const owner = params.get('owner')?.trim() || '';

  const osmLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
    : address
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
      : '';

  const bboxDelta = 0.012;
  const embedSrc =
    hasCoords &&
    `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bboxDelta},${lat - bboxDelta},${lng + bboxDelta},${lat + bboxDelta}&layer=mapnik&marker=${lat}%2C${lng}`;

  const showNoLocationWarning = !address && !hasCoords;

  return {
    lat,
    lng,
    hasCoords,
    address,
    owner,
    osmLink,
    embedSrc: embedSrc || '',
    showNoLocationWarning,
  };
}
