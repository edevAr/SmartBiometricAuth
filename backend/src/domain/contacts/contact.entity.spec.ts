import { Contact, ContactRelationship } from './contact.entity';

describe('Contact (domain)', () => {
  const mk = () =>
    Contact.createNew({
      id: 'c1',
      adminId: 'a1',
      name: 'María López',
      relationship: ContactRelationship.FRIEND,
      email: 'm@test.com',
      phone: '+34',
    });

  it('createNew normaliza email/phone opcionales', () => {
    const c = Contact.createNew({
      id: 'c2',
      adminId: 'a',
      name: 'X',
      relationship: ContactRelationship.OTHER,
    });
    expect(c.email).toBeNull();
    expect(c.phone).toBeNull();
    expect(c.isActive).toBe(true);
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.updatedAt).toBeInstanceOf(Date);
  });

  it('restore y getters', () => {
    const c = Contact.restore('id', {
      adminId: 'a',
      name: 'n',
      relationship: ContactRelationship.FAMILY,
      email: null,
      phone: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(c.id).toBe('id');
    expect(c.relationship).toBe(ContactRelationship.FAMILY);
  });

  it('deactivate, rename, changeRelationship, updateContactInfo', () => {
    const c = mk();
    c.deactivate();
    expect(c.isActive).toBe(false);
    c.rename('Nuevo nombre');
    expect(c.name).toBe('Nuevo nombre');
    c.changeRelationship(ContactRelationship.MOTHER);
    expect(c.relationship).toBe(ContactRelationship.MOTHER);
    c.updateContactInfo('e@e.com', null);
    expect(c.email).toBe('e@e.com');
    c.updateContactInfo(undefined, '123');
    expect(c.phone).toBe('123');
  });
});
