import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        refreshTokens: jest.fn(),
        logout: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config: Record<string, unknown> = {
                NODE_ENV: 'test',
                JWT_ACCESS_EXPIRATION: 15,
                JWT_REFRESH_EXPIRATION: 30,
            };
            return config[key];
        }),
    };

    const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };

    const mockResponse = () => {
        const res: Partial<Response> = {
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis(),
        };
        return res as Response;
    };

    const mockRequest = (cookies: Record<string, string> = {}) => {
        const req: Partial<Request> = {
            cookies,
        };
        return req as Request;
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should set cookies and return success message on registration', async () => {
            mockAuthService.register.mockResolvedValue(mockTokens);
            const res = mockResponse();

            const dto = {
                email: 'test@example.com',
                password: 'password123',
                name: 'John',
            };

            const result = await controller.register(dto, res);

            expect(result).toEqual({ message: 'Registration successful' });
            expect(authService.register).toHaveBeenCalledWith(dto);
            expect(res.cookie).toHaveBeenCalledTimes(2);
            expect(res.cookie).toHaveBeenCalledWith(
                'access_token',
                mockTokens.accessToken,
                expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
            );
            expect(res.cookie).toHaveBeenCalledWith(
                'refresh_token',
                mockTokens.refreshToken,
                expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
            );
        });
    });

    describe('login', () => {
        it('should set cookies and return success message on login', async () => {
            mockAuthService.login.mockResolvedValue(mockTokens);
            const res = mockResponse();

            const dto = {
                email: 'test@example.com',
                password: 'password123',
            };

            const result = await controller.login(dto, res);

            expect(result).toEqual({ message: 'Login successful' });
            expect(authService.login).toHaveBeenCalledWith(dto);
            expect(res.cookie).toHaveBeenCalledTimes(2);
        });
    });

    describe('refresh', () => {
        it('should refresh tokens and set new cookies', async () => {
            const newTokens = {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
            };
            mockAuthService.refreshTokens.mockResolvedValue(newTokens);

            const req = mockRequest({ refresh_token: 'old-refresh-token' });
            const res = mockResponse();

            const result = await controller.refresh(req, res);

            expect(result).toEqual({ message: 'Tokens refreshed' });
            expect(authService.refreshTokens).toHaveBeenCalledWith('old-refresh-token');
            expect(res.cookie).toHaveBeenCalledTimes(2);
        });

        it('should clear cookies if no refresh token provided', async () => {
            const req = mockRequest({});
            const res = mockResponse();

            const result = await controller.refresh(req, res);

            expect(result).toEqual({ message: 'No refresh token' });
            expect(authService.refreshTokens).not.toHaveBeenCalled();
            expect(res.clearCookie).toHaveBeenCalledTimes(2);
        });
    });

    describe('logout', () => {
        it('should clear cookies and return success message', async () => {
            mockAuthService.logout.mockResolvedValue(undefined);

            const req = mockRequest({ refresh_token: 'refresh-token' });
            const res = mockResponse();

            const result = await controller.logout(req, res);

            expect(result).toEqual({ message: 'Logged out successfully' });
            expect(authService.logout).toHaveBeenCalledWith('refresh-token');
            expect(res.clearCookie).toHaveBeenCalledTimes(2);
        });

        it('should clear cookies even without refresh token', async () => {
            const req = mockRequest({});
            const res = mockResponse();

            const result = await controller.logout(req, res);

            expect(result).toEqual({ message: 'Logged out successfully' });
            expect(authService.logout).not.toHaveBeenCalled();
            expect(res.clearCookie).toHaveBeenCalledTimes(2);
        });
    });

    describe('me', () => {
        it('should return current user', async () => {
            const user = { id: '1', email: 'test@example.com' };

            const result = await controller.me(user);

            expect(result).toEqual(user);
        });
    });
});
