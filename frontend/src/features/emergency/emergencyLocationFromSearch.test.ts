import { describe, expect, it } from 'vitest';
import { emergencyLocationFromSearch } from './emergencyLocationFromSearch';

describe('emergencyLocationFromSearch', () => {
  it('coordenadas válidas: hasCoords, osmLink con mlat/mlon, embed y sin aviso', () => {
    const m = emergencyLocationFromSearch('?lat=-34.6&lng=-58.4&owner=Ana');
    expect(m.hasCoords).toBe(true);
    expect(m.lat).toBe(-34.6);
    expect(m.lng).toBe(-58.4);
    expect(m.owner).toBe('Ana');
    expect(m.osmLink).toContain('mlat=-34.6');
    expect(m.osmLink).toContain('mlon=-58.4');
    expect(m.embedSrc).toContain('export/embed.html');
    expect(m.embedSrc).toContain('-58.4');
    expect(m.showNoLocationWarning).toBe(false);
  });

  it('acepta query con prefijo ?', () => {
    const m = emergencyLocationFromSearch('?lat=1&lng=2');
    expect(m.hasCoords).toBe(true);
  });

  it('solo dirección: búsqueda OSM codificada, sin embed', () => {
    const m = emergencyLocationFromSearch('?address=Calle Falsa 123');
    expect(m.hasCoords).toBe(false);
    expect(m.address).toBe('Calle Falsa 123');
    expect(m.osmLink).toContain('/search?query=');
    expect(m.osmLink).toContain(encodeURIComponent('Calle Falsa 123'));
    expect(m.embedSrc).toBe('');
    expect(m.showNoLocationWarning).toBe(false);
  });

  it('sin dirección ni coords: aviso y enlaces vacíos', () => {
    const m = emergencyLocationFromSearch('');
    expect(m.hasCoords).toBe(false);
    expect(m.address).toBe('');
    expect(m.osmLink).toBe('');
    expect(m.embedSrc).toBe('');
    expect(m.showNoLocationWarning).toBe(true);
  });

  it('lat/lng no numéricos: sin coords', () => {
    const m = emergencyLocationFromSearch('?lat=abc&lng=def');
    expect(m.hasCoords).toBe(false);
    expect(m.showNoLocationWarning).toBe(true);
  });

  it('dirección vacía tras trim no cuenta como ubicación', () => {
    const m = emergencyLocationFromSearch('?address=   ');
    expect(m.address).toBe('');
    expect(m.showNoLocationWarning).toBe(true);
  });
});
