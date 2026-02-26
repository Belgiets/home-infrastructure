import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}

export class LoginDto {
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsString()
    password: string;
}

export class RefreshTokenDto {
    @IsString()
    refreshToken: string;
}