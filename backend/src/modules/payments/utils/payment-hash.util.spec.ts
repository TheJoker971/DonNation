import { hashStripePaymentIntent } from './payment-hash.util';

describe('hashStripePaymentIntent', () => {
  it('returns a deterministic 0x-prefixed bytes32 hex', () => {
    const hash = hashStripePaymentIntent('pi_test_123');
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hashStripePaymentIntent('pi_test_123')).toBe(hash);
  });

  it('differs for different payment intent ids', () => {
    expect(hashStripePaymentIntent('pi_a')).not.toBe(
      hashStripePaymentIntent('pi_b'),
    );
  });
});
