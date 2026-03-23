import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAlertDto {
  @IsIn(['OPEN', 'ACKNOWLEDGED', 'RESOLVED'])
  status!: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

  @IsOptional()
  @IsString()
  message?: string;
}
