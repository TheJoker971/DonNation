import { AssociationsService } from './associations.service';
import { ListAssociationsQueryDto } from './dto/list-associations-query.dto';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
export declare class AdminAssociationsController {
    private readonly associationsService;
    constructor(associationsService: AssociationsService);
    list(query: ListAssociationsQueryDto): Promise<{
        owner: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            displayName: string | null;
            walletAddress: string | null;
            createdAt: Date;
        };
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
    }[]>;
    approve(id: string, admin: JwtPayload): Promise<{
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
    }>;
    suspend(id: string, admin: JwtPayload): Promise<{
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
    }>;
}
