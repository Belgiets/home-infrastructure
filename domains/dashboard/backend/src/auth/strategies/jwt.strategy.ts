import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
    sub: string;
    email: string;
    iat: number;
    exp: number;
}

// Extract JWT from cookie
const cookieExtractor = (req: Request): string | null => {
    if (req && req.cookies) {
        return req.cookies['access_token'] || null;
    }
    return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            // Try cookie first, then fall back to Authorization header
            jwtFromRequest: ExtractJwt.fromExtractors([
                cookieExtractor,
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.usersService.findById(payload.sub);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User is deactivated');
        }

        return {
            id: payload.sub,
            email: payload.email,
        };
    }
}
