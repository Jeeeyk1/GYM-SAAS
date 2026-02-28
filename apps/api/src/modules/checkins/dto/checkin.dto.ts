import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min, Max, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum CheckInMethod {
  QR_STAFF_SCAN = 'qr_staff_scan',
  QR_SELF_SCAN = 'qr_self_scan',
  MANUAL = 'manual',
}

export class CheckInDto {
  @IsEnum(CheckInMethod)
  method: CheckInMethod;

  /** Required when method = qr_staff_scan: the member's QR token scanned by staff */
  @ValidateIf((o: CheckInDto) => o.method === CheckInMethod.QR_STAFF_SCAN)
  @IsString()
  qrToken?: string;

  /** Required when method = manual: staff selects a member by ID */
  @ValidateIf((o: CheckInDto) => o.method === CheckInMethod.MANUAL)
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsString()
  station?: string;
}

export class CheckInQueryDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
