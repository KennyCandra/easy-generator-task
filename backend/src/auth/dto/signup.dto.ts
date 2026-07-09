import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export class SignupDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @Matches(passwordPattern, {
    message:
      'password must be at least 8 characters and include at least one letter, one number, and one special character',
  })
  password: string;
}
