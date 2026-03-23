import { EntityBase } from '../common/entity.base';

export enum ContactRelationship {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  FAMILY = 'FAMILY',
  FRIEND = 'FRIEND',
  OTHER = 'OTHER',
}

export interface ContactProps {
  adminId: string;
  name: string;
  relationship: ContactRelationship;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Contact extends EntityBase<string> {
  private props: ContactProps;

  private constructor(id: string, props: ContactProps) {
    super(id);
    this.props = props;
  }

  static createNew(params: {
    id: string;
    adminId: string;
    name: string;
    relationship: ContactRelationship;
    email?: string | null;
    phone?: string | null;
  }): Contact {
    const now = new Date();

    return new Contact(params.id, {
      adminId: params.adminId,
      name: params.name,
      relationship: params.relationship,
      email: params.email ?? null,
      phone: params.phone ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: ContactProps): Contact {
    return new Contact(id, props);
  }

  get adminId(): string {
    return this.props.adminId;
  }

  get name(): string {
    return this.props.name;
  }

  get relationship(): ContactRelationship {
    return this.props.relationship;
  }

  get email(): string | null | undefined {
    return this.props.email;
  }

  get phone(): string | null | undefined {
    return this.props.phone;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  deactivate(): void {
    this.props.isActive = false;
    this.touch();
  }

  rename(name: string): void {
    this.props.name = name;
    this.touch();
  }

  changeRelationship(relationship: ContactRelationship): void {
    this.props.relationship = relationship;
    this.touch();
  }

  updateContactInfo(email?: string | null, phone?: string | null): void {
    this.props.email = email ?? null;
    this.props.phone = phone ?? null;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}

