import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { DonationMintService } from '../blockchain/donation-mint.service';
import { ReceiptService } from '../documents/receipt.service';
type StripeClient = Stripe.Stripe;
type StripeWebhookEvent = ReturnType<StripeClient['webhooks']['constructEvent']>;
export declare class StripeService {
    private readonly config;
    private readonly prisma;
    private readonly donationMintService;
    private readonly receiptService;
    private readonly logger;
    private readonly stripe;
    constructor(config: ConfigService, prisma: PrismaService, donationMintService: DonationMintService, receiptService: ReceiptService);
    private requireStripe;
    isCryptoPaymentsEnabled(): boolean;
    createConnectAccount(associationId: string, email: string): Promise<string>;
    requestCryptoPaymentsCapability(stripeAccountId: string): Promise<boolean>;
    createAccountLink(stripeAccountId: string, _associationId: string): Promise<{
        url: string;
    }>;
    createDonationPaymentIntent(donation: {
        id: string;
        amountEur: number;
        donorId: string;
        association: {
            id: string;
            name: string;
            stripeConnectAccountId: string | null;
            stripeOnboardingComplete: boolean;
        };
    }): Promise<{
        clientSecret: string | null;
        paymentIntentId: string;
        paymentMethods: readonly ["card", "crypto"] | readonly ["card"];
    }>;
    constructWebhookEvent(payload: Buffer, signature: string): StripeWebhookEvent;
    handleWebhookEvent(event: StripeWebhookEvent): Promise<void>;
    private handlePaymentIntentSucceeded;
    private handleAccountUpdated;
}
export {};
