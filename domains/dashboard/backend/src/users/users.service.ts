import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private usersRepository: UsersRepository) {}

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findByEmail(email);
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findById(id);
    }

    async create(email: string, hashedPassword: string, name?: string): Promise<User> {
        return this.usersRepository.create({
            email,
            password: hashedPassword,
            name,
        });
    }
}