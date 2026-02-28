import { IsOptional, IsString, IsObject, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'brandColor must be a valid hex color' })
  brandColor?: string;

  @IsOptional()
  @IsObject()
  operatingHours?: Record<string, { open: string; close: string }>;
}
