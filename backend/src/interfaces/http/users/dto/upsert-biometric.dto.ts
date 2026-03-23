import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertBiometricProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  faceTemplateRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  voiceTemplateRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;
}
