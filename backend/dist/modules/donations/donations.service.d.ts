import { PrismaService } from '../../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { StripeService } from '../payments/stripe.service';
export declare class DonationsService {
    private readonly prisma;
    private readonly stripeService;
    constructor(prisma: PrismaService, stripeService: StripeService);
    create(donorId: string, dto: CreateDonationDto): Promise<{
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
    findMine(donorId: string): Promise<{
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
    createPaymentIntent(donorId: string, donationId: string): Promise<{
        clientSecret: string | null;
        paymentIntentId: string;
        paymentMethods: readonly ["card", "crypto"] | readonly ["card"];
    }>;
    findOneForDonor(donorId: string, donationId: string): Promise<{
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
    calculatePoints(amountEurCents: number): number;
    private toPublicDonation;
    private toPublicInvoice;
}
