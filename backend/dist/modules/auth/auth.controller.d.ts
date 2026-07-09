import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterAssociationDto } from '../associations/dto/register-association.dto';
import { AssociationsService } from '../associations/associations.service';
import type { JwtPayload } from './types/jwt-payload.type';
export declare class AuthController {
    private readonly authService;
    private readonly associationsService;
    constructor(authService: AuthService, associationsService: AssociationsService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            displayName: string | null;
            walletAddress: string | null;
            createdAt: Date;
        };
    }>;
    registerAssociation(dto: RegisterAssociationDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            displayName: string | null;
            walletAddress: string | null;
            createdAt: Date;
        };
        association: {
            id: string;
            name: string;
            slug: string;
            description: string | null;
            logoUrl: string | null;
            status: import("@prisma/client").$Enums.AssociationStatus;
            stripeConnectAccountId: string | null;
            stripeOnboardingComplete: boolean;
            stripeCryptoPaymentsActive: boolean;
            onChainRegistered: boolean;
            approvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            displayName: string | null;
            walletAddress: string | null;
            createdAt: Date;
        };
    }>;
    me(user: JwtPayload): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        displayName: string | null;
        walletAddress: string | null;
        createdAt: Date;
    }>;
}
