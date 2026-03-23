import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContactRelationship } from '@domain/contacts/contact.entity';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ContactRelationship)
  relationship!: ContactRelationship;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

