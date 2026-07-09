export interface DonationReceiptInput {
    donationId: string;
    associationId: string;
    amountEur: number;
    pointsEarned: number;
    isAnonymous: boolean;
    stripePaymentIntentId: string;
}
export declare function hashDonationReceipt(input: DonationReceiptInput): string;
