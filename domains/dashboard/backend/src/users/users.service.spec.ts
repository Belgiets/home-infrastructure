import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
    let service: UsersService;
    let repository: UsersRepository;

    const mockUsersRepository = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
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
                UsersService,
                {
                    provide: UsersRepository,
                    useValue: mockUsersRepository,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        repository = module.get<UsersRepository>(UsersRepository);

        jest.clearAllMocks();
    });

    describe('findByEmail', () => {
        it('should return user if found', async () => {
            mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

            const result = await service.findByEmail('test@example.com');

            expect(result).toEqual(mockUser);
            expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should return null if user not found', async () => {
            mockUsersRepository.findByEmail.mockResolvedValue(null);

            const result = await service.findByEmail('notfound@example.com');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return user if found', async () => {
            mockUsersRepository.findById.mockResolvedValue(mockUser);

            const result = await service.findById('1');

            expect(result).toEqual(mockUser);
            expect(repository.findById).toHaveBeenCalledWith('1');
        });

        it('should return null if user not found', async () => {
            mockUsersRepository.findById.mockResolvedValue(null);

            const result = await service.findById('999');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create user with hashed password', async () => {
            mockUsersRepository.create.mockResolvedValue(mockUser);

            const result = await service.create('test@example.com', 'hashedPassword', 'John');

            expect(result).toEqual(mockUser);
            expect(repository.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'hashedPassword',
                name: 'John',
            });
        });

        it('should create user without name', async () => {
            const userWithoutName = { ...mockUser, name: undefined };
            mockUsersRepository.create.mockResolvedValue(userWithoutName);

            const result = await service.create('test@example.com', 'hashedPassword');

            expect(result).toEqual(userWithoutName);
            expect(repository.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'hashedPassword',
                name: undefined,
            });
        });
    });
});