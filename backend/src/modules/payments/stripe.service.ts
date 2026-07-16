import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { DonationMintService } from '../blockchain/donation-mint.service';
import { ReceiptService } from '../documents/receipt.service';
import { hashStripePaymentIntent } from './utils/payment-hash.util';

type StripeClient = Stripe.Stripe;
type StripeWebhookEvent = ReturnType<
  StripeClient['webhooks']['constructEvent']
>;
type StripePaymentIntent = StripeWebhookEvent['data']['object'] & {
  id: string;
  metadata?: { donationId?: string };
  payment_method_types?: string[];
};
type StripeConnectAccount = StripeWebhookEvent['data']['object'] & {
  id: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  metadata?: { associationId?: string };
  capabilities?: { crypto_payments?: string };
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe.Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly donationMintService: DonationMintService,
    private readonly receiptService: ReceiptService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  private requireStripe(): Stripe.Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    return this.stripe;
  }

  isCryptoPaymentsEnabled(): boolean {
    return (
      this.config.get<string>('STRIPE_CRYPTO_PAYMENTS_ENABLED', 'true') !==
      'false'
    );
  }

  async createConnectAccount(
    associationId: string,
    email: string,
  ): Promise<string> {
    const stripe = this.requireStripe();

    // card_payments + transfers only.
    // Stripe does NOT allow requesting crypto_payments for Express accounts in FR
    // (error: "The crypto_payments capability is not requestable for accounts in FR").
    // Requesting it at creation time fails the whole Connect onboarding.
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { associationId },
    });

    return account.id;
  }

  async requestCryptoPaymentsCapability(
    stripeAccountId: string,
  ): Promise<boolean> {
    // Crypto payments are not available for FR Connect accounts.
    // Keep this as a no-op best-effort for future non-FR support.
    if (!this.isCryptoPaymentsEnabled()) {
      return false;
    }

    const stripe = this.requireStripe();

    try {
      const capability = await stripe.accounts.updateCapability(
        stripeAccountId,
        'crypto_payments',
        { requested: true },
      );
      return capability.status === 'active';
    } catch (error) {
      this.logger.warn(
        `Could not request crypto_payments for account ${stripeAccountId} (often unavailable for FR)`,
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  async createAccountLink(stripeAccountId: string): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');

    await this.requestCryptoPaymentsCapability(stripeAccountId);

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/association/stripe/refresh`,
      return_url: `${appUrl}/association/stripe/return`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async createDonationPaymentIntent(donation: {
    id: string;
    amountEur: number;
    donorId: string;
    association: {
      id: string;
      name: string;
      stripeConnectAccountId: string | null;
      stripeOnboardingComplete: boolean;
    };
  }) {
    const stripe = this.requireStripe();

    if (!donation.association.stripeConnectAccountId) {
      throw new BadRequestException('Association has not connected Stripe');
    }

    if (!donation.association.stripeOnboardingComplete) {
      throw new BadRequestException(
        'Association Stripe onboarding is not complete',
      );
    }

    const connectAccountId = donation.association.stripeConnectAccountId;
    const cryptoRequested = this.isCryptoPaymentsEnabled();

    if (cryptoRequested) {
      await this.requestCryptoPaymentsCapability(connectAccountId);
    }

    const baseParams = {
      amount: donation.amountEur,
      currency: 'eur' as const,
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

    const paymentMethodTypes = cryptoRequested
      ? (['card', 'crypto'] as const)
      : (['card'] as const);

    let paymentIntent: Awaited<
      ReturnType<StripeClient['paymentIntents']['create']>
    >;
    let cryptoAvailable = cryptoRequested;

    try {
      paymentIntent = await stripe.paymentIntents.create({
        ...baseParams,
        payment_method_types: [...paymentMethodTypes],
      });
    } catch (error) {
      if (!cryptoRequested) {
        throw error;
      }

      this.logger.warn(
        'PaymentIntent with crypto failed, falling back to card only',
        error instanceof Error ? error.message : error,
      );
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
      paymentMethods: cryptoAvailable
        ? (['card', 'crypto'] as const)
        : (['card'] as const),
    };
  }

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): StripeWebhookEvent {
    const stripe = this.requireStripe();
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  async handleWebhookEvent(event: StripeWebhookEvent): Promise<void> {
    const existing = await this.prisma.stripeEvent.findUnique({
      where: { id: event.id },
    });
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

  private async handlePaymentIntentSucceeded(
    paymentIntent: StripePaymentIntent,
  ) {
    const donationId = paymentIntent.metadata?.donationId;
    if (!donationId) {
      this.logger.warn(
        `payment_intent.succeeded without donationId: ${paymentIntent.id}`,
      );
      return;
    }

    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: { invoice: true },
    });

    if (!donation) {
      this.logger.warn(
        `Donation not found for payment intent ${paymentIntent.id}`,
      );
      return;
    }

    if (
      donation.status === DonationStatus.PAID ||
      donation.status === DonationStatus.COMPLETED
    ) {
      return;
    }

    const paymentMethodTypes = paymentIntent.payment_method_types ?? [];
    const paidWithCrypto = paymentMethodTypes.includes('crypto');
    this.logger.log(
      `Donation ${donationId} paid via ${paidWithCrypto ? 'USDC (crypto)' : 'card'} (${paymentIntent.id})`,
    );

    const externalPaymentIdHash = hashStripePaymentIntent(paymentIntent.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.donation.update({
        where: { id: donationId },
        data: {
          status: DonationStatus.PAID,
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
    } catch (error) {
      this.logger.error(
        `Receipt generation failed for donation ${donationId}`,
        error,
      );
    }
  }

  private async handleAccountUpdated(account: StripeConnectAccount) {
    const associationId = account.metadata?.associationId;
    if (!associationId) {
      return;
    }

    await this.applyConnectAccountStatus(account.id, associationId, account);
  }

  /**
   * Sync Stripe Connect status from Stripe API into the DB.
   * Needed in local/dev when webhooks are not forwarded (Stripe CLI).
   */
  async syncConnectAccountStatus(
    stripeAccountId: string,
    associationId: string,
  ): Promise<{
    stripeOnboardingComplete: boolean;
    stripeCryptoPaymentsActive: boolean;
  }> {
    const stripe = this.requireStripe();
    const account = (await stripe.accounts.retrieve(
      stripeAccountId,
    )) as StripeConnectAccount;

    return this.applyConnectAccountStatus(
      stripeAccountId,
      associationId,
      account,
    );
  }

  private async applyConnectAccountStatus(
    stripeAccountId: string,
    associationId: string,
    account: StripeConnectAccount,
  ): Promise<{
    stripeOnboardingComplete: boolean;
    stripeCryptoPaymentsActive: boolean;
  }> {
    const onboardingComplete = Boolean(
      account.charges_enabled && account.details_submitted,
    );
    const cryptoActive = account.capabilities?.crypto_payments === 'active';

    await this.prisma.association.updateMany({
      where: { id: associationId, stripeConnectAccountId: stripeAccountId },
      data: {
        stripeOnboardingComplete: onboardingComplete,
        stripeCryptoPaymentsActive: cryptoActive,
      },
    });

    return {
      stripeOnboardingComplete: onboardingComplete,
      stripeCryptoPaymentsActive: cryptoActive,
    };
  }
}
