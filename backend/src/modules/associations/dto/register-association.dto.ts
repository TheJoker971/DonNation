import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterAssociationDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens (e.g. croix-rouge-paris)',
  })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;
}
