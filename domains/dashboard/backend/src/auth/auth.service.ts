import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import {TokenPayload, Tokens} from "./types/token.types";

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {}

    async register(dto: RegisterDto): Promise<Tokens> {
        const existingUser = await this.usersService.findByEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.usersService.create(dto.email, hashedPassword, dto.name);

        return this.generateTokens({ sub: user.id, email: user.email });
    }

    async login(dto: LoginDto): Promise<Tokens> {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User is deactivated');
        }

        return this.generateTokens({ sub: user.id, email: user.email });
    }

    async refreshTokens(refreshToken: string): Promise<Tokens> {
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });

        if (!storedToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (new Date() > storedToken.expiresAt) {
            await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
            throw new UnauthorizedException('Refresh token expired');
        }

        if (!storedToken.user.isActive) {
            throw new UnauthorizedException('User is deactivated');
        }

        // Token rotation — видаляємо старий токен
        await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

        return this.generateTokens({
            sub: storedToken.user.id,
            email: storedToken.user.email,
        });
    }

    async logout(refreshToken: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
    }

    async logoutAll(userId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }

    private async generateTokens(payload: TokenPayload): Promise<Tokens> {
        const accessMinutes = this.configService.get<number>('JWT_ACCESS_EXPIRATION_MINUTES') || 15;

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
            expiresIn: accessMinutes * 60,
        });

        const refreshToken = this.generateRefreshToken();

        const refreshMinutes = this.configService.get<number>('JWT_REFRESH_EXPIRATION_MINUTES') || 30;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + refreshMinutes);

        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: payload.sub,
                expiresAt,
            },
        });

        return { accessToken, refreshToken };
    }

    private generateRefreshToken(): string {
        return randomBytes(64).toString('hex');
    }
}