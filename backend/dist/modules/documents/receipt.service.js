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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ReceiptService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const path_1 = require("path");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_service_1 = require("../../prisma/prisma.service");
let ReceiptService = ReceiptService_1 = class ReceiptService {
    prisma;
    config;
    logger = new common_1.Logger(ReceiptService_1.name);
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async ensureReceipt(donationId) {
        const donation = await this.prisma.donation.findUnique({
            where: { id: donationId },
            include: {
                invoice: true,
                association: true,
                donor: { select: { email: true, displayName: true } },
            },
        });
        if (!donation?.invoice) {
            return null;
        }
        if (donation.invoice.pdfUrl) {
            const filePath = this.resolveFilePath(donation.invoice.pdfUrl);
            if (filePath && (0, fs_1.existsSync)(filePath)) {
                return donation.invoice.pdfUrl;
            }
        }
        if (donation.status === 'PENDING' || donation.status === 'CANCELLED' || !donation.invoice) {
            return null;
        }
        const pdfUrl = await this.generatePdf({
            id: donation.id,
            amountEur: donation.amountEur,
            isAnonymous: donation.isAnonymous,
            status: donation.status,
            createdAt: donation.createdAt,
            stripePaymentIntentId: donation.stripePaymentIntentId,
            association: donation.association,
            donor: donation.donor,
            invoice: donation.invoice,
        });
        await this.prisma.invoice.update({
            where: { id: donation.invoice.id },
            data: { pdfUrl },
        });
        return pdfUrl;
    }
    async ensureReceiptForDonor(donorId, donationId) {
        const donation = await this.prisma.donation.findFirst({
            where: { id: donationId, donorId },
        });
        if (!donation) {
            throw new common_1.NotFoundException('Donation not found');
        }
        const pdfUrl = await this.ensureReceipt(donationId);
        if (!pdfUrl) {
            throw new common_1.NotFoundException('Receipt not available yet');
        }
        return pdfUrl;
    }
    async ensureReceiptForAssociation(ownerId, donationId) {
        const association = await this.prisma.association.findUnique({ where: { ownerId } });
        if (!association) {
            throw new common_1.NotFoundException('Association not found');
        }
        const donation = await this.prisma.donation.findFirst({
            where: { id: donationId, associationId: association.id },
        });
        if (!donation) {
            throw new common_1.NotFoundException('Donation not found');
        }
        const pdfUrl = await this.ensureReceipt(donationId);
        if (!pdfUrl) {
            throw new common_1.NotFoundException('Receipt not available yet');
        }
        return pdfUrl;
    }
    async generatePdf(donation) {
        const receiptsDir = (0, path_1.join)(process.cwd(), 'uploads', 'receipts');
        (0, fs_1.mkdirSync)(receiptsDir, { recursive: true });
        const filename = `${donation.invoice.id}.pdf`;
        const filePath = (0, path_1.join)(receiptsDir, filename);
        const publicUrl = `${this.getPublicBaseUrl()}/uploads/receipts/${filename}`;
        await new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const stream = (0, fs_1.createWriteStream)(filePath);
            doc.pipe(stream);
            doc.fontSize(22).text('DonNation — Reçu de donation', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).fillColor('#444444');
            doc.text(`Association : ${donation.association.name}`);
            doc.text(`Montant : ${(donation.amountEur / 100).toFixed(2)} €`);
            doc.text(`Date : ${donation.createdAt.toLocaleString('fr-FR')}`);
            doc.text(`Référence don : ${donation.id}`);
            if (donation.stripePaymentIntentId) {
                doc.text(`Paiement Stripe : ${donation.stripePaymentIntentId}`);
            }
            if (donation.isAnonymous) {
                doc.text('Donateur : Anonyme');
            }
            else {
                doc.text(`Donateur : ${donation.donor.displayName ?? donation.donor.email}`);
            }
            doc.moveDown();
            doc.text(`Statut : ${donation.status}`);
            doc.text(`Reçu NFT : ${donation.invoice.status}`);
            if (donation.invoice.tokenId != null) {
                doc.text(`Token ID : ${donation.invoice.tokenId}`);
            }
            if (donation.invoice.txHash) {
                doc.text(`Transaction : ${donation.invoice.txHash}`);
            }
            if (donation.invoice.receiptHash) {
                doc.text(`Hash reçu : ${donation.invoice.receiptHash}`);
            }
            doc.moveDown();
            doc.fontSize(10).fillColor('#666666').text('Ce document atteste du paiement enregistré sur DonNation. Le reçu certifié blockchain complète cette preuve lorsque le mint NFT est terminé.', { align: 'left' });
            doc.end();
            stream.on('finish', () => resolve());
            stream.on('error', reject);
        });
        this.logger.log(`Receipt PDF generated for donation ${donation.id}`);
        return publicUrl;
    }
    getPublicBaseUrl() {
        return (this.config.get('BACKEND_PUBLIC_URL') ??
            `http://localhost:${this.config.get('PORT', 3000)}`);
    }
    resolveFilePath(pdfUrl) {
        const marker = '/uploads/receipts/';
        const index = pdfUrl.indexOf(marker);
        if (index === -1) {
            return null;
        }
        const relative = pdfUrl.slice(index + 1);
        return (0, path_1.join)(process.cwd(), relative);
    }
};
exports.ReceiptService = ReceiptService;
exports.ReceiptService = ReceiptService = ReceiptService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ReceiptService);
//# sourceMappingURL=receipt.service.js.map