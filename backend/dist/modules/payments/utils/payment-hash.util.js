"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashStripePaymentIntent = hashStripePaymentIntent;
const crypto_1 = require("crypto");
function hashStripePaymentIntent(paymentIntentId) {
    const digest = (0, crypto_1.createHash)('sha256').update(`stripe:pi:${paymentIntentId}`).digest('hex');
    return `0x${digest}`;
}
//# sourceMappingURL=payment-hash.util.js.map