import { IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsIn(['gym_owner', 'staff'])
  role: 'gym_owner' | 'staff';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
