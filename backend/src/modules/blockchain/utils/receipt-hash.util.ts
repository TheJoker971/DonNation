import { keccak256, toUtf8Bytes } from 'ethers';

export interface DonationReceiptInput {
  donationId: string;
  associationId: string;
  amountEur: number;
  pointsEarned: number;
  isAnonymous: boolean;
  stripePaymentIntentId: string;
}

/** Hash du reçu off-chain (metadata IPFS en Phase 8). */
export function hashDonationReceipt(input: DonationReceiptInput): string {
  const payload = JSON.stringify({
    donationId: input.donationId,
    associationId: input.associationId,
    amountEur: input.amountEur,
    pointsEarned: input.pointsEarned,
    isAnonymous: input.isAnonymous,
    stripePaymentIntentId: input.stripePaymentIntentId,
  });

  return keccak256(toUtf8Bytes(payload));
}
