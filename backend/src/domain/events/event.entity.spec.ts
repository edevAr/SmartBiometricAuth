import { Event, EventType } from './event.entity';

describe('Event (domain)', () => {
  it('createNew asigna detectedAt y metadata', () => {
    const e = Event.createNew({
      id: 'e1',
      cameraId: 'cam',
      type: EventType.MOTION_DETECTED,
      contactId: null,
      metadataJson: '{"x":1}',
    });
    expect(e.type).toBe(EventType.MOTION_DETECTED);
    expect(e.contactId).toBeNull();
    expect(e.metadataJson).toBe('{"x":1}');
    expect(e.detectedAt).toBeInstanceOf(Date);
  });

  it('createNew sin contactId ni metadata usa null', () => {
    const e = Event.createNew({
      id: 'e0',
      cameraId: 'cam',
      type: EventType.KNOWN_VISITOR,
    });
    expect(e.contactId).toBeNull();
    expect(e.metadataJson).toBeNull();
  });

  it('restore conserva props', () => {
    const d = new Date('2021-06-15');
    const e = Event.restore('e2', {
      cameraId: 'c',
      contactId: 'u1',
      type: EventType.INTRUDER_ALERT,
      detectedAt: d,
      metadataJson: null,
    });
    expect(e.id).toBe('e2');
    expect(e.detectedAt).toBe(d);
    expect(e.contactId).toBe('u1');
    expect(e.metadataJson).toBeNull();
  });
});
