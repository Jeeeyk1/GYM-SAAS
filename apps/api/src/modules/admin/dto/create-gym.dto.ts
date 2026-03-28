import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateGymDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug: string;

  @IsString()
  name: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  ownerFirstName: string;

  @IsString()
  ownerLastName: string;

  @IsOptional()
  @IsIn(['basic', 'advanced', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsOptional()
  @IsDateString()
  demoExpiresAt?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
