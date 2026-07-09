import { Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
type CreateUserInput = {
    email: string;
    passwordHash: string;
    role?: Role;
    displayName?: string;
};
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(data: CreateUserInput): Promise<User>;
    toPublic(user: User): {
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        displayName: string | null;
        walletAddress: string | null;
        createdAt: Date;
    };
}
export {};
