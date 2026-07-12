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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const stripe_service_1 = require("../payments/stripe.service");
const donor_level_util_1 = require("./utils/donor-level.util");
let DonationsService = class DonationsService {
    prisma;
    stripeService;
    constructor(prisma, stripeService) {
        this.prisma = prisma;
        this.stripeService = stripeService;
    }
    async create(donorId, dto) {
        const association = await this.prisma.association.findUnique({
            where: { id: dto.associationId },
        });
        if (!association) {
            throw new common_1.NotFoundException('Association not found');
        }
        if (association.status !== client_1.AssociationStatus.APPROVED) {
            throw new common_1.BadRequestException('Association is not approved for donations');
        }
        const donor = await this.prisma.user.findUnique({ where: { id: donorId } });
        const pointsEarned = this.calculatePoints(dto.amountEur);
        const result = await this.prisma.$transaction(async (tx) => {
            const donation = await tx.donation.create({
                data: {
                    donorId,
                    associationId: dto.associationId,
                    amountEur: dto.amountEur,
                    pointsEarned,
                    isAnonymous: dto.isAnonymous ?? false,
                    status: client_1.DonationStatus.PENDING,
                    donorWallet: donor?.walletAddress ?? null,
                },
                include: {
                    association: { select: { id: true, name: true, slug: true } },
                },
            });
            const invoice = await tx.invoice.create({
                data: {
                    donationId: donation.id,
                    status: client_1.InvoiceStatus.PENDING,
                },
            });
            return { donation, invoice };
        });
        return {
            donation: this.toPublicDonation(result.donation),
            invoice: this.toPublicInvoice(result.invoice),
        };
    }
    async findMine(donorId) {
        const donations = await this.prisma.donation.findMany({
            where: { donorId },
            include: {
                association: { select: { id: true, name: true, slug: true } },
                invoice: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return donations.map((donation) => ({
            ...this.toPublicDonation(donation),
            association: donation.association,
            invoice: donation.invoice ? this.toPublicInvoice(donation.invoice) : null,
        }));
    }
    async findDonorStats(donorId) {
        const paidStatuses = [
            client_1.DonationStatus.PAID,
            client_1.DonationStatus.MINTING,
            client_1.DonationStatus.COMPLETED,
        ];
        const donations = await this.prisma.donation.findMany({
            where: { donorId, status: { in: paidStatuses } },
            select: {
                amountEur: true,
                pointsEarned: true,
                associationId: true,
            },
        });
        const totalDonatedEur = donations.reduce((sum, d) => sum + d.amountEur, 0);
        const totalPoints = donations.reduce((sum, d) => sum + d.pointsEarned, 0);
        const associationsSupported = new Set(donations.map((d) => d.associationId)).size;
        return {
            totalDonatedEur,
            totalPoints,
            donationCount: donations.length,
            associationsSupported,
            level: (0, donor_level_util_1.getDonorLevel)(totalPoints),
        };
    }
    async createPaymentIntent(donorId, donationId) {
        const donation = await this.prisma.donation.findFirst({
            where: { id: donationId, donorId },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                        stripeConnectAccountId: true,
                        stripeOnboardingComplete: true,
                    },
                },
            },
        });
        if (!donation) {
            throw new common_1.NotFoundException('Donation not found');
        }
        if (donation.status !== client_1.DonationStatus.PENDING) {
            throw new common_1.BadRequestException('Donation is not pending payment');
        }
        return this.stripeService.createDonationPaymentIntent(donation);
    }
    async findOneForDonor(donorId, donationId) {
        const donation = await this.prisma.donation.findFirst({
            where: { id: donationId, donorId },
            include: {
                association: { select: { id: true, name: true, slug: true } },
                invoice: true,
            },
        });
        if (!donation) {
            throw new common_1.NotFoundException('Donation not found');
        }
        return {
            ...this.toPublicDonation(donation),
            association: donation.association,
            invoice: donation.invoice ? this.toPublicInvoice(donation.invoice) : null,
        };
    }
    calculatePoints(amountEurCents) {
        return Math.max(1, Math.floor(amountEurCents / 100));
    }
    toPublicDonation(donation) {
        return {
            id: donation.id,
            donorId: donation.donorId,
            associationId: donation.associationId,
            amountEur: donation.amountEur,
            pointsEarned: donation.pointsEarned,
            isAnonymous: donation.isAnonymous,
            status: donation.status,
            stripePaymentIntentId: donation.stripePaymentIntentId,
            donorWallet: donation.donorWallet,
            createdAt: donation.createdAt,
            updatedAt: donation.updatedAt,
        };
    }
    toPublicInvoice(invoice) {
        return {
            id: invoice.id,
            donationId: invoice.donationId,
            externalPaymentIdHash: invoice.externalPaymentIdHash,
            receiptHash: invoice.receiptHash,
            tokenId: invoice.tokenId,
            txHash: invoice.txHash,
            chainId: invoice.chainId,
            metadataUrl: invoice.metadataUrl,
            pdfUrl: invoice.pdfUrl,
            status: invoice.status,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
        };
    }
};
exports.DonationsService = DonationsService;
exports.DonationsService = DonationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService])
], DonationsService);
//# sourceMappingURL=donations.service.js.map