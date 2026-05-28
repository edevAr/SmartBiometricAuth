import { describe, expect, it } from 'vitest';
import type { Contact } from './api';
import { contactToCardModel, isFullyTrained } from './contactDisplay';

function c(partial: Partial<Contact> & Pick<Contact, 'id' | 'name' | 'relationship'>): Contact {
  return {
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('contactDisplay', () => {
  it('mapea relaciones del API a etiquetas', () => {
    expect(contactToCardModel(c({ id: '1', name: 'A', relationship: 'FRIEND' })).relationship).toBe(
      'Amigo',
    );
    expect(
      contactToCardModel(c({ id: '2', name: 'B', relationship: 'FAMILY' })).relationship,
    ).toBe('Familia');
    expect(
      contactToCardModel(c({ id: '3', name: 'C', relationship: 'FATHER' })).relationship,
    ).toBe('Familia');
    expect(
      contactToCardModel(c({ id: '4', name: 'D', relationship: 'MOTHER' })).relationship,
    ).toBe('Familia');
    expect(
      contactToCardModel(c({ id: '5', name: 'E', relationship: 'OTHER' })).relationship,
    ).toBe('Contacto de Confianza');
  });

  it('iniciales y tono estable por id', () => {
    const one = contactToCardModel(c({ id: 'z1', name: 'Solo', relationship: 'FRIEND' }));
    expect(one.initials).toBe('SO');
    const two = contactToCardModel(
      c({ id: 'z2', name: 'Ana María García', relationship: 'FAMILY' }),
    );
    expect(two.initials).toBe('AG');
    const empty = contactToCardModel(
      c({ id: 'z3', name: '   ', relationship: 'OTHER' }),
    );
    expect(empty.initials).toBe('?');
  });

  it('email/teléfono y flags biométricos', () => {
    const x = contactToCardModel(
      c({
        id: 'i1',
        name: 'X',
        relationship: 'FRIEND',
        email: '  a@b.com  ',
        phone: null,
        faceEnrolled: true,
        voiceEnrolled: false,
      }),
    );
    expect(x.email).toBe('a@b.com');
    expect(x.phone).toBe('—');
    expect(x.faceOk).toBe(true);
    expect(x.voiceOk).toBe(false);
    expect(isFullyTrained(x)).toBe(false);
    expect(isFullyTrained({ ...x, voiceOk: true })).toBe(true);
  });
});
