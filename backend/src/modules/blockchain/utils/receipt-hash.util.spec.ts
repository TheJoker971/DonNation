import { hashDonationReceipt } from './receipt-hash.util';

describe('hashDonationReceipt', () => {
  const input = {
    donationId: 'don-1',
    associationId: 'asso-1',
    amountEur: 5000,
    pointsEarned: 50,
    isAnonymous: true,
    stripePaymentIntentId: 'pi_test',
  };

  it('returns a deterministic 0x-prefixed hash', () => {
    const hash = hashDonationReceipt(input);
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hashDonationReceipt(input)).toBe(hash);
  });
});
