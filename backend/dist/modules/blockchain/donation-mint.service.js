"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DonationMintService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationMintService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const blockchain_service_1 = require("./blockchain.service");
const receipt_hash_util_1 = require("./utils/receipt-hash.util");
let DonationMintService = DonationMintService_1 = class DonationMintService {
    prisma;
    blockchain;
    config;
    logger = new common_1.Logger(DonationMintService_1.name);
    constructor(prisma, blockchain, config) {
        this.prisma = prisma;
        this.blockchain = blockchain;
        this.config = config;
    }
    async mintPaidDonation(donationId) {
        if (!this.blockchain.isEnabled()) {
            this.logger.debug(`Skipping mint for ${donationId}: blockchain not configured`);
            return;
        }
        const donation = await this.prisma.donation.findUnique({
            where: { id: donationId },
            include: {
                invoice: true,
                association: true,
                donor: { select: { walletAddress: true } },
            },
        });
        if (!donation || !donation.invoice) {
            this.logger.warn(`Cannot mint ${donationId}: donation or invoice missing`);
            return;
        }
        if (donation.status === client_1.DonationStatus.COMPLETED) {
            return;
        }
        if (donation.status !== client_1.DonationStatus.PAID && donation.status !== client_1.DonationStatus.MINTING) {
            this.logger.warn(`Cannot mint ${donationId}: status is ${donation.status}`);
            return;
        }
        if (!donation.invoice.externalPaymentIdHash) {
            this.logger.warn(`Cannot mint ${donationId}: externalPaymentIdHash missing`);
            return;
        }
        if (!donation.stripePaymentIntentId) {
            this.logger.warn(`Cannot mint ${donationId}: stripePaymentIntentId missing`);
            return;
        }
        const mintTo = this.resolveMintRecipient(donation.donor.walletAddress);
        if (!mintTo) {
            this.logger.warn(`Cannot mint ${donationId}: no donor wallet and BLOCKCHAIN_CUSTODIAL_WALLET unset`);
            return;
        }
        await this.prisma.donation.update({
            where: { id: donationId },
            data: { status: client_1.DonationStatus.MINTING },
        });
        try {
            await this.blockchain.ensureAssociationActive(donation.associationId);
            if (!donation.association.onChainRegistered) {
                await this.prisma.association.update({
                    where: { id: donation.associationId },
                    data: { onChainRegistered: true },
                });
            }
            const receiptHash = (0, receipt_hash_util_1.hashDonationReceipt)({
                donationId: donation.id,
                associationId: donation.associationId,
                amountEur: donation.amountEur,
                pointsEarned: donation.pointsEarned,
                isAnonymous: donation.isAnonymous,
                stripePaymentIntentId: donation.stripePaymentIntentId,
            });
            const { txHash, tokenId } = await this.blockchain.mintInvoice({
                associationId: donation.associationId,
                to: mintTo,
                amountEur: donation.amountEur,
                pointsEarned: donation.pointsEarned,
                externalPaymentIdHash: donation.invoice.externalPaymentIdHash,
                receiptHash,
            });
            await this.prisma.$transaction(async (tx) => {
                await tx.invoice.update({
                    where: { id: donation.invoice.id },
                    data: {
                        receiptHash,
                        tokenId,
                        txHash,
                        chainId: this.blockchain.getChainId(),
                        status: client_1.InvoiceStatus.MINTED,
                    },
                });
                await tx.donation.update({
                    where: { id: donationId },
                    data: { status: client_1.DonationStatus.COMPLETED, donorWallet: mintTo },
                });
            });
            this.logger.log(`Donation ${donationId} minted as token #${tokenId} (${txHash})`);
        }
        catch (error) {
            this.logger.error(`Mint failed for donation ${donationId}`, error);
            await this.prisma.$transaction(async (tx) => {
                await tx.donation.update({
                    where: { id: donationId },
                    data: { status: client_1.DonationStatus.PAID },
                });
                await tx.invoice.update({
                    where: { id: donation.invoice.id },
                    data: { status: client_1.InvoiceStatus.FAILED },
                });
            });
        }
    }
    resolveMintRecipient(donorWallet) {
        if (donorWallet) {
            return donorWallet;
        }
        return this.config.get('BLOCKCHAIN_CUSTODIAL_WALLET') ?? null;
    }
};
exports.DonationMintService = DonationMintService;
exports.DonationMintService = DonationMintService = DonationMintService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        blockchain_service_1.BlockchainService,
        config_1.ConfigService])
], DonationMintService);
//# sourceMappingURL=donation-mint.service.js.map