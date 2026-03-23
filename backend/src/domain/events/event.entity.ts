import { EntityBase } from '../common/entity.base';

export enum EventType {
  KNOWN_VISITOR = 'KNOWN_VISITOR',
  UNKNOWN_VISITOR = 'UNKNOWN_VISITOR',
  INTRUDER_ALERT = 'INTRUDER_ALERT',
  /** Cambio visual entre fotogramas (proxy de movimiento en escena). */
  MOTION_DETECTED = 'MOTION_DETECTED',
  /** Cambio visual fuerte (heurística; no es detección ML de persona). */
  PERSON_DETECTED = 'PERSON_DETECTED',
}

export interface EventProps {
  cameraId: string;
  contactId?: string | null;
  type: EventType;
  detectedAt: Date;
  metadataJson?: string | null;
}

export class Event extends EntityBase<string> {
  private props: EventProps;

  private constructor(id: string, props: EventProps) {
    super(id);
    this.props = props;
  }

  static createNew(params: {
    id: string;
    cameraId: string;
    type: EventType;
    contactId?: string | null;
    metadataJson?: string | null;
  }): Event {
    const now = new Date();
    return new Event(params.id, {
      cameraId: params.cameraId,
      contactId: params.contactId ?? null,
      type: params.type,
      detectedAt: now,
      metadataJson: params.metadataJson ?? null,
    });
  }

  static restore(id: string, props: EventProps): Event {
    return new Event(id, props);
  }

  get cameraId(): string {
    return this.props.cameraId;
  }

  get contactId(): string | null | undefined {
    return this.props.contactId;
  }

  get type(): EventType {
    return this.props.type;
  }

  get detectedAt(): Date {
    return this.props.detectedAt;
  }

  get metadataJson(): string | null | undefined {
    return this.props.metadataJson;
  }
}

