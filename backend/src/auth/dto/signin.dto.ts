import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class SigninDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
