import { IsIn, IsNumber, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateAccessAttemptDto {
  @IsOptional()
  @IsUUID()
  cameraId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsIn(['GRANTED', 'DENIED', 'UNKNOWN'])
  outcome!: 'GRANTED' | 'DENIED' | 'UNKNOWN';

  @IsIn(['FACIAL', 'VOICE', 'BOTH', 'PIN'])
  method!: 'FACIAL' | 'VOICE' | 'BOTH' | 'PIN';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
