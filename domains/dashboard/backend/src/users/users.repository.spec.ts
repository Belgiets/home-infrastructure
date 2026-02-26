import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersRepository', () => {
    let repository: UsersRepository;
    let prisma: PrismaService;

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersRepository,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        repository = module.get<UsersRepository>(UsersRepository);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('findByEmail', () => {
        it('should return user if found', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: 'hashed',
                name: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await repository.findByEmail('test@example.com');

            expect(result).toEqual(mockUser);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
        });

        it('should return null if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            const result = await repository.findByEmail('notfound@example.com');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return user if found', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: 'hashed',
                name: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await repository.findById('1');

            expect(result).toEqual(mockUser);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: '1' },
            });
        });
    });

    describe('create', () => {
        it('should create and return user', async () => {
            const mockUser = {
                id: '1',
                email: 'new@example.com',
                password: 'hashed',
                name: 'John',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.user.create.mockResolvedValue(mockUser);

            const result = await repository.create({
                email: 'new@example.com',
                password: 'hashed',
                name: 'John',
            });

            expect(result).toEqual(mockUser);
            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: 'new@example.com',
                    password: 'hashed',
                    name: 'John',
                },
            });
        });
    });
});