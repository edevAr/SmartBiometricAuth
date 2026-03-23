import type { Contact } from './api';

export type RelationshipLabel = 'Familia' | 'Amigo' | 'Contacto de Confianza';

export type ContactCardModel = {
  id: string;
  name: string;
  relationship: RelationshipLabel;
  initials: string;
  avatarTone:
    | 'blue'
    | 'green'
    | 'purple'
    | 'orange'
    | 'pink'
    | 'indigo'
    | 'teal'
    | 'rose';
  email: string;
  phone: string;
  faceOk: boolean;
  voiceOk: boolean;
  lastAccess: string;
};

const TONES: ContactCardModel['avatarTone'][] = [
  'blue',
  'green',
  'purple',
  'orange',
  'pink',
  'indigo',
  'teal',
  'rose',
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return Math.abs(h);
}

function relationshipFromApi(rel: string): RelationshipLabel {
  const u = rel.toUpperCase();
  if (u === 'FRIEND') return 'Amigo';
  if (u === 'FAMILY' || u === 'FATHER' || u === 'MOTHER') return 'Familia';
  return 'Contacto de Confianza';
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/**
 * Convierte un contacto del API al formato de tarjeta.
 * Rostro/voz entrenados solo si el backend indica enroll (más adelante vía API);
 * por defecto: no entrenados (contacto nuevo).
 */
export function contactToCardModel(c: Contact): ContactCardModel {
  const tone = TONES[hashId(c.id) % TONES.length];
  return {
    id: c.id,
    name: c.name,
    relationship: relationshipFromApi(c.relationship),
    initials: initialsFromName(c.name),
    avatarTone: tone,
    email: c.email?.trim() || '—',
    phone: c.phone?.trim() || '—',
    faceOk: c.faceEnrolled === true,
    voiceOk: c.voiceEnrolled === true,
    lastAccess: '—',
  };
}

export function isFullyTrained(c: ContactCardModel): boolean {
  return c.faceOk && c.voiceOk;
}
