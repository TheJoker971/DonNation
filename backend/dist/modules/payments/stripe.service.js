"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const stripe_1 = __importDefault(require("stripe"));
const prisma_service_1 = require("../../prisma/prisma.service");
const donation_mint_service_1 = require("../blockchain/donation-mint.service");
const receipt_service_1 = require("../documents/receipt.service");
const payment_hash_util_1 = require("./utils/payment-hash.util");
let StripeService = StripeService_1 = class StripeService {
    config;
    prisma;
    donationMintService;
    receiptService;
    logger = new common_1.Logger(StripeService_1.name);
    stripe;
    constructor(config, prisma, donationMintService, receiptService) {
        this.config = config;
        this.prisma = prisma;
        this.donationMintService = donationMintService;
        this.receiptService = receiptService;
        const secretKey = this.config.get('STRIPE_SECRET_KEY');
        this.stripe = secretKey ? new stripe_1.default(secretKey) : null;
    }
    requireStripe() {
        if (!this.stripe) {
            throw new common_1.BadRequestException('Stripe is not configured');
        }
        return this.stripe;
    }
    isCryptoPaymentsEnabled() {
        return this.config.get('STRIPE_CRYPTO_PAYMENTS_ENABLED', 'true') !== 'false';
    }
    async createConnectAccount(associationId, email) {
        const stripe = this.requireStripe();
        const capabilities = {
            card_payments: { requested: true },
            transfers: { requested: true },
        };
        if (this.isCryptoPaymentsEnabled()) {
            capabilities.crypto_payments = { requested: true };
        }
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'FR',
            email,
            capabilities,
            metadata: { associationId },
        });
        return account.id;
    }
    async requestCryptoPaymentsCapability(stripeAccountId) {
        if (!this.isCryptoPaymentsEnabled()) {
            return false;
        }
        const stripe = this.requireStripe();
        try {
            const capability = await stripe.accounts.updateCapability(stripeAccountId, 'crypto_payments', { requested: true });
            return capability.status === 'active';
        }
        catch (error) {
            this.logger.warn(`Could not request crypto_payments for account ${stripeAccountId}`, error instanceof Error ? error.message : error);
            return false;
        }
    }
    async createAccountLink(stripeAccountId, _associationId) {
        const stripe = this.requireStripe();
        const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
        await this.requestCryptoPaymentsCapability(stripeAccountId);
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${appUrl}/association/stripe/refresh`,
            return_url: `${appUrl}/association/stripe/return`,
            type: 'account_onboarding',
        });
        return { url: accountLink.url };
    }
    async createDonationPaymentIntent(donation) {
        const stripe = this.requireStripe();
        if (!donation.association.stripeConnectAccountId) {
            throw new common_1.BadRequestException('Association has not connected Stripe');
        }
        if (!donation.association.stripeOnboardingComplete) {
            throw new common_1.BadRequestException('Association Stripe onboarding is not complete');
        }
        const connectAccountId = donation.association.stripeConnectAccountId;
        const cryptoRequested = this.isCryptoPaymentsEnabled();
        if (cryptoRequested) {
            await this.requestCryptoPaymentsCapability(connectAccountId);
        }
        const baseParams = {
            amount: donation.amountEur,
            currency: 'eur',
            transfer_data: {
                destination: connectAccountId,
            },
            metadata: {
                donationId: donation.id,
                donorId: donation.donorId,
                associationId: donation.association.id,
            },
            description: `Donation to ${donation.association.name}`,
        };
        const paymentMethodTypes = cryptoRequested ? ['card', 'crypto'] : ['card'];
        let paymentIntent;
        let cryptoAvailable = cryptoRequested;
        try {
            paymentIntent = await stripe.paymentIntents.create({
                ...baseParams,
                payment_method_types: [...paymentMethodTypes],
            });
        }
        catch (error) {
            if (!cryptoRequested) {
                throw error;
            }
            this.logger.warn('PaymentIntent with crypto failed, falling back to card only', error instanceof Error ? error.message : error);
            cryptoAvailable = false;
            paymentIntent = await stripe.paymentIntents.create({
                ...baseParams,
                payment_method_types: ['card'],
            });
        }
        await this.prisma.donation.update({
            where: { id: donation.id },
            data: { stripePaymentIntentId: paymentIntent.id },
        });
        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            paymentMethods: cryptoAvailable ? ['card', 'crypto'] : ['card'],
        };
    }
    constructWebhookEvent(payload, signature) {
        const stripe = this.requireStripe();
        const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            throw new common_1.BadRequestException('Stripe webhook secret is not configured');
        }
        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
    async handleWebhookEvent(event) {
        const existing = await this.prisma.stripeEvent.findUnique({ where: { id: event.id } });
        if (existing) {
            this.logger.debug(`Stripe event ${event.id} already processed`);
            return;
        }
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'account.updated':
                await this.handleAccountUpdated(event.data.object);
                break;
            default:
                this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
        }
        await this.prisma.stripeEvent.create({
            data: { id: event.id, type: event.type },
        });
    }
    async handlePaymentIntentSucceeded(paymentIntent) {
        const donationId = paymentIntent.metadata?.donationId;
        if (!donationId) {
            this.logger.warn(`payment_intent.succeeded without donationId: ${paymentIntent.id}`);
            return;
        }
        const donation = await this.prisma.donation.findUnique({
            where: { id: donationId },
            include: { invoice: true },
        });
        if (!donation) {
            this.logger.warn(`Donation not found for payment intent ${paymentIntent.id}`);
            return;
        }
        if (donation.status === client_1.DonationStatus.PAID || donation.status === client_1.DonationStatus.COMPLETED) {
            return;
        }
        const paymentMethodTypes = paymentIntent.payment_method_types ?? [];
        const paidWithCrypto = paymentMethodTypes.includes('crypto');
        this.logger.log(`Donation ${donationId} paid via ${paidWithCrypto ? 'USDC (crypto)' : 'card'} (${paymentIntent.id})`);
        const externalPaymentIdHash = (0, payment_hash_util_1.hashStripePaymentIntent)(paymentIntent.id);
        await this.prisma.$transaction(async (tx) => {
            await tx.donation.update({
                where: { id: donationId },
                data: {
                    status: client_1.DonationStatus.PAID,
                    stripePaymentIntentId: paymentIntent.id,
                },
            });
            if (donation.invoice) {
                await tx.invoice.update({
                    where: { id: donation.invoice.id },
                    data: { externalPaymentIdHash },
                });
            }
        });
        this.logger.log(`Donation ${donationId} marked as PAID`);
        await this.donationMintService.mintPaidDonation(donationId);
        try {
            await this.receiptService.ensureReceipt(donationId);
        }
        catch (error) {
            this.logger.error(`Receipt generation failed for donation ${donationId}`, error);
        }
    }
    async handleAccountUpdated(account) {
        const associationId = account.metadata?.associationId;
        if (!associationId) {
            return;
        }
        const onboardingComplete = Boolean(account.charges_enabled && account.details_submitted);
        const cryptoActive = account.capabilities?.crypto_payments === 'active';
        await this.prisma.association.updateMany({
            where: { id: associationId, stripeConnectAccountId: account.id },
            data: {
                stripeOnboardingComplete: onboardingComplete,
                stripeCryptoPaymentsActive: cryptoActive,
            },
        });
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        donation_mint_service_1.DonationMintService,
        receipt_service_1.ReceiptService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map