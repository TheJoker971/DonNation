"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashDonationReceipt = hashDonationReceipt;
const ethers_1 = require("ethers");
function hashDonationReceipt(input) {
    const payload = JSON.stringify({
        donationId: input.donationId,
        associationId: input.associationId,
        amountEur: input.amountEur,
        pointsEarned: input.pointsEarned,
        isAnonymous: input.isAnonymous,
        stripePaymentIntentId: input.stripePaymentIntentId,
    });
    return (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(payload));
}
//# sourceMappingURL=receipt-hash.util.js.map