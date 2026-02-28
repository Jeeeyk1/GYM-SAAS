import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  membershipType?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'pending'])
  status?: string;
}
