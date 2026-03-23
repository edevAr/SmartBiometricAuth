import {
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsPort,
  IsString,
} from 'class-validator';

export class RegisterCameraDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIP()
  ipAddress!: string;

  /** Puerto HTTP para snapshot / interfaz web (por defecto 80). */
  @IsPort()
  @IsOptional()
  port?: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  /** Ruta RTSP por defecto si no se envía (p. ej. integración futura con ffmpeg). */
  @IsString()
  @IsOptional()
  rtspPath?: string;

  @IsString()
  @IsOptional()
  location?: string;
}

