import { createHash } from 'crypto';

/** bytes32-compatible hex hash for Stripe payment intent (used on-chain in Phase 7). */
export function hashStripePaymentIntent(paymentIntentId: string): string {
  const digest = createHash('sha256')
    .update(`stripe:pi:${paymentIntentId}`)
    .digest('hex');
  return `0x${digest}`;
}
