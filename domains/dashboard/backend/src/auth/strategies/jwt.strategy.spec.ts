import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let usersService: UsersService;

    const mockUsersService = {
        findById: jest.fn(),
    };

    const mockConfigService = {
        getOrThrow: jest.fn().mockReturnValue('test-secret'),
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
                JwtStrategy,
                { provide: UsersService, useValue: mockUsersService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        strategy = module.get<JwtStrategy>(JwtStrategy);
        usersService = module.get<UsersService>(UsersService);

        jest.clearAllMocks();
    });

    describe('validate', () => {
        const payload = {
            sub: '1',
            email: 'test@example.com',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        };

        it('should return user data for valid payload', async () => {
            mockUsersService.findById.mockResolvedValue(mockUser);

            const result = await strategy.validate(payload);

            expect(result).toEqual({
                id: '1',
                email: 'test@example.com',
            });
            expect(usersService.findById).toHaveBeenCalledWith('1');
        });

        it('should throw UnauthorizedException if user not found', async () => {
            mockUsersService.findById.mockResolvedValue(null);

            await expect(strategy.validate(payload)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException if user is deactivated', async () => {
            mockUsersService.findById.mockResolvedValue({
                ...mockUser,
                isActive: false,
            });

            await expect(strategy.validate(payload)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});