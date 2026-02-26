import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Get,
    Res,
    Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

// Cookie names
const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) {}

    private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
        const isProduction = this.configService.get('NODE_ENV') === 'production';

        // Access token cookie - short lived
        res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
            httpOnly: true,
            secure: isProduction, // HTTPS only in production
            sameSite: 'lax',
            maxAge: (this.configService.get<number>('JWT_ACCESS_EXPIRATION') || 15) * 60 * 1000,
        });

        // Refresh token cookie - longer lived
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: (this.configService.get<number>('JWT_REFRESH_EXPIRATION') || 30) * 60 * 1000,
        });
    }

    private clearTokenCookies(res: Response) {
        res.clearCookie(ACCESS_TOKEN_COOKIE);
        res.clearCookie(REFRESH_TOKEN_COOKIE);
    }

    @Public()
    @Post('register')
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const tokens = await this.authService.register(dto);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
        return { message: 'Registration successful' };
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const tokens = await this.authService.login(dto);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
        return { message: 'Login successful' };
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
        if (!refreshToken) {
            this.clearTokenCookies(res);
            return { message: 'No refresh token' };
        }

        const tokens = await this.authService.refreshTokens(refreshToken);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
        return { message: 'Tokens refreshed' };
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }
        this.clearTokenCookies(res);
        return { message: 'Logged out successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@CurrentUser() user: { id: string; email: string }) {
        return user;
    }
}
