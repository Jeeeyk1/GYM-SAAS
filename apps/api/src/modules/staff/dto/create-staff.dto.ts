import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsIn(['gym_admin', 'front_desk'])
  role: 'gym_admin' | 'front_desk';

  @IsOptional()
  @IsString()
  title?: string;
}
