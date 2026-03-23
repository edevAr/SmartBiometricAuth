import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ContactRelationship } from '@domain/contacts/contact.entity';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(ContactRelationship)
  relationship?: ContactRelationship;

  @IsOptional()
  @IsString()
  roleName?: string;
}
