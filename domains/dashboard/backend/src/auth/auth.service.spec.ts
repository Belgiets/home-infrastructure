import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
    let authService: AuthService;
    let usersService: UsersService;
    let jwtService: JwtService;
    let prisma: PrismaService;

    const mockUsersService = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
    };

    const mockJwtService = {
        signAsync: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config = {
                JWT_ACCESS_EXPIRATION_MINUTES: 15,
                JWT_REFRESH_EXPIRATION_MINUTES: 30,
            };
            return config[key];
        }),
        getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    const mockPrismaService = {
        refreshToken: {
            create: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
    };

    const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'John',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
        jwtService = module.get<JwtService>(JwtService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register new user and return tokens', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue(mockUser);
            mockJwtService.signAsync.mockResolvedValue('access-token');
            mockPrismaService.refreshToken.create.mockResolvedValue({});
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

            const result = await authService.register({
                email: 'test@example.com',
                password: 'password123',
                name: 'John',
            });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        });

        it('should throw ConflictException if user exists', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);

            await expect(
                authService.register({
                    email: 'test@example.com',
                    password: 'password123',
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('login', () => {
        it('should return tokens for valid credentials', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockJwtService.signAsync.mockResolvedValue('access-token');
            mockPrismaService.refreshToken.create.mockResolvedValue({});

            const result = await authService.login({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('should throw UnauthorizedException if user not found', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);

            await expect(
                authService.login({
                    email: 'notfound@example.com',
                    password: 'password123',
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if password invalid', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                authService.login({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if user is deactivated', async () => {
            mockUsersService.findByEmail.mockResolvedValue({
                ...mockUser,
                isActive: false,
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await expect(
                authService.login({
                    email: 'test@example.com',
                    password: 'password123',
                }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('refreshTokens', () => {
        const mockStoredToken = {
            id: 'token-id',
            token: 'valid-refresh-token',
            userId: '1',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
            createdAt: new Date(),
            user: mockUser,
        };

        it('should return new tokens for valid refresh token', async () => {
            mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
            mockPrismaService.refreshToken.delete.mockResolvedValue({});
            mockPrismaService.refreshToken.create.mockResolvedValue({});
            mockJwtService.signAsync.mockResolvedValue('new-access-token');

            const result = await authService.refreshTokens('valid-refresh-token');

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
                where: { id: 'token-id' },
            });
        });

        it('should throw UnauthorizedException if token not found', async () => {
            mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

            await expect(
                authService.refreshTokens('invalid-token'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if token expired', async () => {
            mockPrismaService.refreshToken.findUnique.mockResolvedValue({
                ...mockStoredToken,
                expiresAt: new Date(Date.now() - 1000),
            });
            mockPrismaService.refreshToken.delete.mockResolvedValue({});

            await expect(
                authService.refreshTokens('expired-token'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if user is deactivated', async () => {
            mockPrismaService.refreshToken.findUnique.mockResolvedValue({
                ...mockStoredToken,
                user: { ...mockUser, isActive: false },
            });

            await expect(
                authService.refreshTokens('valid-refresh-token'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('logout', () => {
        it('should delete refresh token', async () => {
            mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

            await authService.logout('refresh-token');

            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { token: 'refresh-token' },
            });
        });
    });

    describe('logoutAll', () => {
        it('should delete all refresh tokens for user', async () => {
            mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

            await authService.logoutAll('1');

            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { userId: '1' },
            });
        });
    });
});