import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  const mockPaymentIntentsCreate = jest.fn();
  const mockAccountsUpdateCapability = jest.fn();
  const mockDonationUpdate = jest.fn();

  const createService = (cryptoEnabled = 'true') => {
    const config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
        if (key === 'STRIPE_CRYPTO_PAYMENTS_ENABLED') return cryptoEnabled;
        return defaultValue;
      }),
    } as unknown as ConfigService;

    const prisma = {
      donation: { update: mockDonationUpdate },
      stripeEvent: { findUnique: jest.fn(), create: jest.fn() },
      association: { updateMany: jest.fn() },
    };

    const donationMintService = { mintPaidDonation: jest.fn() };
    const receiptService = { ensureReceipt: jest.fn() };

    const service = new StripeService(
      config,
      prisma as never,
      donationMintService as never,
      receiptService as never,
    );

    (service as unknown as { stripe: unknown }).stripe = {
      paymentIntents: { create: mockPaymentIntentsCreate },
      accounts: { updateCapability: mockAccountsUpdateCapability },
    };

    return service;
  };

  const donationFixture = {
    id: 'don-1',
    amountEur: 5000,
    donorId: 'donor-1',
    association: {
      id: 'asso-1',
      name: 'Test Asso',
      stripeConnectAccountId: 'acct_test',
      stripeOnboardingComplete: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountsUpdateCapability.mockResolvedValue({ status: 'active' });
    mockDonationUpdate.mockResolvedValue({});
  });

  describe('isCryptoPaymentsEnabled', () => {
    it('returns true by default', () => {
      const service = createService();
      expect(service.isCryptoPaymentsEnabled()).toBe(true);
    });

    it('returns false when env is false', () => {
      const service = createService('false');
      expect(service.isCryptoPaymentsEnabled()).toBe(false);
    });
  });

  describe('createDonationPaymentIntent', () => {
    it('creates PaymentIntent with card and crypto when enabled', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_test',
        client_secret: 'cs_test',
      });

      const service = createService();
      const result = await service.createDonationPaymentIntent(donationFixture);

      expect(mockAccountsUpdateCapability).toHaveBeenCalledWith(
        'acct_test',
        'crypto_payments',
        {
          requested: true,
        },
      );
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card', 'crypto'],
          currency: 'eur',
          amount: 5000,
        }),
      );
      expect(result.paymentMethods).toEqual(['card', 'crypto']);
    });

    it('falls back to card only when crypto PaymentIntent fails', async () => {
      mockPaymentIntentsCreate
        .mockRejectedValueOnce(new Error('crypto not enabled'))
        .mockResolvedValueOnce({ id: 'pi_card', client_secret: 'cs_card' });

      const service = createService();
      const result = await service.createDonationPaymentIntent(donationFixture);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(2);
      expect(
        mockPaymentIntentsCreate.mock.calls[1][0].payment_method_types,
      ).toEqual(['card']);
      expect(result.paymentMethods).toEqual(['card']);
    });

    it('uses card only when crypto disabled via env', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_card',
        client_secret: 'cs_card',
      });

      const service = createService('false');
      const result = await service.createDonationPaymentIntent(donationFixture);

      expect(mockAccountsUpdateCapability).not.toHaveBeenCalled();
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method_types: ['card'] }),
      );
      expect(result.paymentMethods).toEqual(['card']);
    });
  });
});
