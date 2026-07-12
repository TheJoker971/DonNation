import { DonationsService } from './donations.service';
import { ReceiptService } from '../documents/receipt.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
export declare class DonationsController {
    private readonly donationsService;
    private readonly receiptService;
    constructor(donationsService: DonationsService, receiptService: ReceiptService);
    create(user: JwtPayload, dto: CreateDonationDto): Promise<{
        donation: {
            id: string;
            donorId: string;
            associationId: string;
            amountEur: number;
            pointsEarned: number;
            isAnonymous: boolean;
            status: import("@prisma/client").$Enums.DonationStatus;
            stripePaymentIntentId: string | null;
            donorWallet: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        invoice: {
            id: string;
            donationId: string;
            externalPaymentIdHash: string | null;
            receiptHash: string | null;
            tokenId: number | null;
            txHash: string | null;
            chainId: number | null;
            metadataUrl: string | null;
            pdfUrl: string | null;
            status: import("@prisma/client").$Enums.InvoiceStatus;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    findMine(user: JwtPayload): Promise<{
        association: {
            name: string;
            id: string;
            slug: string;
        };
        invoice: {
            id: string;
            donationId: string;
            externalPaymentIdHash: string | null;
            receiptHash: string | null;
            tokenId: number | null;
            txHash: string | null;
            chainId: number | null;
            metadataUrl: string | null;
            pdfUrl: string | null;
            status: import("@prisma/client").$Enums.InvoiceStatus;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        id: string;
        donorId: string;
        associationId: string;
        amountEur: number;
        pointsEarned: number;
        isAnonymous: boolean;
        status: import("@prisma/client").$Enums.DonationStatus;
        stripePaymentIntentId: string | null;
        donorWallet: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findMyStats(user: JwtPayload): Promise<{
        totalDonatedEur: number;
        totalPoints: number;
        donationCount: number;
        associationsSupported: number;
        level: import("./utils/donor-level.util").DonorLevel;
    }>;
    pay(user: JwtPayload, id: string): Promise<{
        clientSecret: string | null;
        paymentIntentId: string;
        paymentMethods: readonly ["card", "crypto"] | readonly ["card"];
    }>;
    receipt(user: JwtPayload, id: string): Promise<{
        pdfUrl: string;
    }>;
    findOne(user: JwtPayload, id: string): Promise<{
        association: {
            name: string;
            id: string;
            slug: string;
        };
        invoice: {
            id: string;
            donationId: string;
            externalPaymentIdHash: string | null;
            receiptHash: string | null;
            tokenId: number | null;
            txHash: string | null;
            chainId: number | null;
            metadataUrl: string | null;
            pdfUrl: string | null;
            status: import("@prisma/client").$Enums.InvoiceStatus;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        id: string;
        donorId: string;
        associationId: string;
        amountEur: number;
        pointsEarned: number;
        isAnonymous: boolean;
        status: import("@prisma/client").$Enums.DonationStatus;
        stripePaymentIntentId: string | null;
        donorWallet: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
