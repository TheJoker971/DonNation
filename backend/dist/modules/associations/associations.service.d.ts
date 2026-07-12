import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AssociationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterAssociationDto } from './dto/register-association.dto';
import { StripeService } from '../payments/stripe.service';
import { BlockchainService } from '../blockchain/blockchain.service';
export declare class AssociationsService {
    private readonly prisma;
    private readonly jwtService;
    private readonly stripeService;
    private readonly blockchainService;
    private readonly config;
    private readonly logger;
    private readonly saltRounds;
    constructor(prisma: PrismaService, jwtService: JwtService, stripeService: StripeService, blockchainService: BlockchainService, config: ConfigService);
    register(dto: RegisterAssociationDto): Promise<{
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
    startStripeOnboarding(ownerId: string): Promise<{
        url: string;
    }>;
    findPublicCatalog(): Promise<{
        stats: {
            totalRaisedEur: number;
            donationCount: number;
            donorCount: number;
        };
        id: string;
        name: string;
        slug: string;
        description: string | null;
        logoUrl: string | null;
        stripeOnboardingComplete: boolean;
        stripeCryptoPaymentsActive: boolean;
        approvedAt: Date | null;
    }[]>;
    findPublicBySlug(slug: string): Promise<{
        onChainRegistered: boolean;
        stats: {
            totalRaisedEur: number;
            donationCount: number;
            donorCount: number;
        };
        recentSupporters: {
            displayName: string;
            amountEur: number;
            createdAt: Date;
        }[];
        id: string;
        name: string;
        slug: string;
        description: string | null;
        logoUrl: string | null;
        stripeOnboardingComplete: boolean;
        stripeCryptoPaymentsActive: boolean;
        approvedAt: Date | null;
    }>;
    private getPaidDonationStatuses;
    private emptyAssociationStats;
    private loadAssociationStats;
    findAllForAdmin(status?: AssociationStatus): Promise<{
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
    findMine(ownerId: string): Promise<{
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
    }>;
    approve(associationId: string, adminId: string): Promise<{
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
    suspend(associationId: string, adminId: string): Promise<{
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
    private updateStatus;
    findReceivedDonations(ownerId: string): Promise<{
        id: string;
        amountEur: number;
        pointsEarned: number;
        isAnonymous: boolean;
        status: import("@prisma/client").$Enums.DonationStatus;
        createdAt: Date;
        donor: {
            displayName: string | null;
            email: string;
        } | null;
        invoice: {
            id: string;
            status: import("@prisma/client").$Enums.InvoiceStatus;
            tokenId: number | null;
            pdfUrl: string | null;
        } | null;
    }[]>;
    updateLogo(ownerId: string, file: Express.Multer.File): Promise<{
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
    private getPublicBaseUrl;
    private resolveRegistrationSlug;
    private syncAssociationOnChain;
    private toPublicUser;
    private toCatalogAssociation;
    private toPublicAssociation;
}
