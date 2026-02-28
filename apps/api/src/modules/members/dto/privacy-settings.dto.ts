import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @IsOptional()
  @IsBoolean()
  showInActiveMembers?: boolean;

  @IsOptional()
  @IsBoolean()
  showCheckinHistory?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMemberMessaging?: boolean;
}
