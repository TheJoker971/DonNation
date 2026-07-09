"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DONATION_INVOICES_ABI = exports.DON_NATION_PROTOCOL_ABI = void 0;
exports.DON_NATION_PROTOCOL_ABI = [
    'function registerAssociation(bytes32 associationId)',
    'function setAssociationActive(bytes32 associationId)',
    'function mintInvoice(address to, bytes32 associationId, uint256 amountEur, uint256 pointsEarned, bytes32 externalPaymentIdHash, bytes32 receiptHash, string fidelityCardUri)',
    'function getAssociation(bytes32 associationId) view returns (tuple(bool registered, bool active, bool fidelityEnabled, string invoicesUri))',
    'function donationInvoices() view returns (address)',
];
exports.DONATION_INVOICES_ABI = [
    'event InvoiceMinted(address indexed invoiceOwner, uint256 indexed tokenId, bytes32 indexed associationId, uint256 amountEur)',
];
//# sourceMappingURL=donnation-protocol.abi.js.map