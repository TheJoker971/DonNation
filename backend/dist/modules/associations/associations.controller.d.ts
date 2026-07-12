import { AssociationsService } from './associations.service';
import { ReceiptService } from '../documents/receipt.service';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
export declare class AssociationsController {
    private readonly associationsService;
    private readonly receiptService;
    constructor(associationsService: AssociationsService, receiptService: ReceiptService);
    findPublic(): Promise<{
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
    me(user: JwtPayload): Promise<{
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
    receivedDonations(user: JwtPayload): Promise<{
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
    donationReceipt(user: JwtPayload, id: string): Promise<{
        pdfUrl: string;
    }>;
    uploadLogo(user: JwtPayload, file: Express.Multer.File): Promise<{
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
    startStripeOnboarding(user: JwtPayload): Promise<{
        url: string;
    }>;
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
}
