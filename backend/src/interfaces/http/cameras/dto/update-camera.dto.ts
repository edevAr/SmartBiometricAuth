import { IsBoolean, IsIP, IsOptional, IsPort, IsString } from 'class-validator';

export class UpdateCameraDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsPort()
  @IsOptional()
  port?: string;

  @IsString()
  @IsOptional()
  username?: string;

  /** Si se omite o va vacío, no se cambia la contraseña guardada. */
  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  rtspPath?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
