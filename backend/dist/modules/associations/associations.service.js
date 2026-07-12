"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AssociationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssociationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const fs_1 = require("fs");
const path_1 = require("path");
const prisma_service_1 = require("../../prisma/prisma.service");
const stripe_service_1 = require("../payments/stripe.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const slug_util_1 = require("./utils/slug.util");
let AssociationsService = AssociationsService_1 = class AssociationsService {
    prisma;
    jwtService;
    stripeService;
    blockchainService;
    config;
    logger = new common_1.Logger(AssociationsService_1.name);
    saltRounds = 12;
    constructor(prisma, jwtService, stripeService, blockchainService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.stripeService = stripeService;
        this.blockchainService = blockchainService;
        this.config = config;
    }
    async register(dto) {
        const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (emailTaken) {
            throw new common_1.ConflictException('Email already in use');
        }
        const slug = await this.resolveRegistrationSlug(dto);
        const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    passwordHash,
                    role: client_1.Role.ASSOCIATION,
                    displayName: dto.name,
                },
            });
            const association = await tx.association.create({
                data: {
                    ownerId: user.id,
                    name: dto.name,
                    slug,
                    description: dto.description,
                    status: client_1.AssociationStatus.PENDING,
                },
            });
            return { user, association };
        });
        const payload = {
            sub: result.user.id,
            email: result.user.email,
            role: result.user.role,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            user: this.toPublicUser(result.user),
            association: this.toPublicAssociation(result.association),
        };
    }
    async startStripeOnboarding(ownerId) {
        const association = await this.prisma.association.findUnique({
            where: { ownerId },
            include: { owner: true },
        });
        if (!association) {
            throw new common_1.NotFoundException('Association not found for this account');
        }
        let stripeConnectAccountId = association.stripeConnectAccountId;
        if (!stripeConnectAccountId) {
            stripeConnectAccountId = await this.stripeService.createConnectAccount(association.id, association.owner.email);
            await this.prisma.association.update({
                where: { id: association.id },
                data: { stripeConnectAccountId },
            });
        }
        return this.stripeService.createAccountLink(stripeConnectAccountId, association.id);
    }
    async findPublicCatalog() {
        const associations = await this.prisma.association.findMany({
            where: { status: client_1.AssociationStatus.APPROVED },
            orderBy: { name: 'asc' },
        });
        const statsByAssociation = await this.loadAssociationStats(associations.map((a) => a.id));
        return associations.map((association) => ({
            ...this.toCatalogAssociation(association),
            stats: statsByAssociation.get(association.id) ?? this.emptyAssociationStats(),
        }));
    }
    async findPublicBySlug(slug) {
        const association = await this.prisma.association.findFirst({
            where: { slug, status: client_1.AssociationStatus.APPROVED },
        });
        if (!association) {
            throw new common_1.NotFoundException('Association not found');
        }
        const statsMap = await this.loadAssociationStats([association.id]);
        const stats = statsMap.get(association.id) ?? this.emptyAssociationStats();
        const recentDonations = await this.prisma.donation.findMany({
            where: {
                associationId: association.id,
                status: { in: this.getPaidDonationStatuses() },
            },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
                amountEur: true,
                createdAt: true,
                isAnonymous: true,
                donor: { select: { displayName: true } },
            },
        });
        return {
            ...this.toCatalogAssociation(association),
            onChainRegistered: association.onChainRegistered,
            stats,
            recentSupporters: recentDonations.map((donation) => ({
                displayName: donation.isAnonymous
                    ? 'Donateur anonyme'
                    : donation.donor.displayName || 'Donateur',
                amountEur: donation.amountEur,
                createdAt: donation.createdAt,
            })),
        };
    }
    getPaidDonationStatuses() {
        return [client_1.DonationStatus.PAID, client_1.DonationStatus.MINTING, client_1.DonationStatus.COMPLETED];
    }
    emptyAssociationStats() {
        return {
            totalRaisedEur: 0,
            donationCount: 0,
            donorCount: 0,
        };
    }
    async loadAssociationStats(associationIds) {
        if (associationIds.length === 0) {
            return new Map();
        }
        const paidStatuses = this.getPaidDonationStatuses();
        const [aggregates, donorGroups] = await Promise.all([
            this.prisma.donation.groupBy({
                by: ['associationId'],
                where: {
                    associationId: { in: associationIds },
                    status: { in: paidStatuses },
                },
                _sum: { amountEur: true },
                _count: { _all: true },
            }),
            this.prisma.donation.groupBy({
                by: ['associationId', 'donorId'],
                where: {
                    associationId: { in: associationIds },
                    status: { in: paidStatuses },
                },
            }),
        ]);
        const donorCountByAssociation = new Map();
        for (const row of donorGroups) {
            donorCountByAssociation.set(row.associationId, (donorCountByAssociation.get(row.associationId) ?? 0) + 1);
        }
        const statsMap = new Map();
        for (const id of associationIds) {
            statsMap.set(id, this.emptyAssociationStats());
        }
        for (const row of aggregates) {
            statsMap.set(row.associationId, {
                totalRaisedEur: row._sum.amountEur ?? 0,
                donationCount: row._count._all,
                donorCount: donorCountByAssociation.get(row.associationId) ?? 0,
            });
        }
        return statsMap;
    }
    async findAllForAdmin(status) {
        const associations = await this.prisma.association.findMany({
            where: status ? { status } : undefined,
            include: { owner: true },
            orderBy: { createdAt: 'desc' },
        });
        return associations.map((association) => ({
            ...this.toPublicAssociation(association),
            owner: this.toPublicUser(association.owner),
        }));
    }
    async findMine(ownerId) {
        const association = await this.prisma.association.findUnique({
            where: { ownerId },
            include: { owner: true },
        });
        if (!association) {
            throw new common_1.NotFoundException('Association not found for this account');
        }
        return {
            ...this.toPublicAssociation(association),
            owner: this.toPublicUser(association.owner),
        };
    }
    async approve(associationId, adminId) {
        return this.updateStatus(associationId, adminId, client_1.AssociationStatus.APPROVED);
    }
    async suspend(associationId, adminId) {
        return this.updateStatus(associationId, adminId, client_1.AssociationStatus.SUSPENDED);
    }
    async updateStatus(associationId, adminId, status) {
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });
        if (!association) {
            throw new common_1.NotFoundException('Association not found');
        }
        if (status === client_1.AssociationStatus.APPROVED && association.status === client_1.AssociationStatus.APPROVED) {
            throw new common_1.ConflictException('Association is already approved');
        }
        if (status === client_1.AssociationStatus.SUSPENDED && association.status === client_1.AssociationStatus.SUSPENDED) {
            throw new common_1.ConflictException('Association is already suspended');
        }
        const updated = await this.prisma.association.update({
            where: { id: associationId },
            data: {
                status,
                approvedAt: status === client_1.AssociationStatus.APPROVED ? new Date() : association.approvedAt,
                approvedById: status === client_1.AssociationStatus.APPROVED ? adminId : association.approvedById,
            },
        });
        await this.syncAssociationOnChain(associationId, status);
        return this.toPublicAssociation(updated);
    }
    async findReceivedDonations(ownerId) {
        const association = await this.prisma.association.findUnique({ where: { ownerId } });
        if (!association) {
            throw new common_1.NotFoundException('Association not found for this account');
        }
        const donations = await this.prisma.donation.findMany({
            where: {
                associationId: association.id,
                status: { in: [client_1.DonationStatus.PAID, client_1.DonationStatus.MINTING, client_1.DonationStatus.COMPLETED] },
            },
            include: {
                donor: { select: { email: true, displayName: true } },
                invoice: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return donations.map((donation) => ({
            id: donation.id,
            amountEur: donation.amountEur,
            pointsEarned: donation.pointsEarned,
            isAnonymous: donation.isAnonymous,
            status: donation.status,
            createdAt: donation.createdAt,
            donor: donation.isAnonymous
                ? null
                : {
                    displayName: donation.donor.displayName,
                    email: donation.donor.email,
                },
            invoice: donation.invoice
                ? {
                    id: donation.invoice.id,
                    status: donation.invoice.status,
                    tokenId: donation.invoice.tokenId,
                    pdfUrl: donation.invoice.pdfUrl,
                }
                : null,
        }));
    }
    async updateLogo(ownerId, file) {
        const association = await this.prisma.association.findUnique({ where: { ownerId } });
        if (!association) {
            throw new common_1.NotFoundException('Association not found for this account');
        }
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const extension = (0, path_1.extname)(file.originalname).toLowerCase();
        if (!allowed.includes(extension)) {
            throw new common_1.BadRequestException('Logo must be JPG, PNG or WebP');
        }
        const logosDir = (0, path_1.join)(process.cwd(), 'uploads', 'logos');
        (0, fs_1.mkdirSync)(logosDir, { recursive: true });
        const filename = `${association.id}${extension}`;
        const filePath = (0, path_1.join)(logosDir, filename);
        (0, fs_1.writeFileSync)(filePath, file.buffer);
        const logoUrl = `${this.getPublicBaseUrl()}/uploads/logos/${filename}`;
        const updated = await this.prisma.association.update({
            where: { id: association.id },
            data: { logoUrl },
        });
        return this.toPublicAssociation(updated);
    }
    getPublicBaseUrl() {
        return (this.config.get('BACKEND_PUBLIC_URL') ??
            `http://localhost:${this.config.get('PORT', 3000)}`);
    }
    async resolveRegistrationSlug(dto) {
        const base = (0, slug_util_1.slugify)(dto.name);
        if (base.length < 2) {
            throw new common_1.BadRequestException('Association name must contain enough characters to generate a public URL');
        }
        const existing = await this.prisma.association.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
        });
        return (0, slug_util_1.buildUniqueSlug)(base, new Set(existing.map((association) => association.slug)));
    }
    async syncAssociationOnChain(associationId, status) {
        if (!this.blockchainService.isEnabled()) {
            return;
        }
        try {
            if (status === client_1.AssociationStatus.APPROVED) {
                await this.blockchainService.ensureAssociationActive(associationId);
                await this.prisma.association.update({
                    where: { id: associationId },
                    data: { onChainRegistered: true },
                });
            }
            if (status === client_1.AssociationStatus.SUSPENDED) {
                await this.blockchainService.deactivateAssociation(associationId);
            }
        }
        catch (error) {
            this.logger.error(`On-chain sync failed for association ${associationId}`, error);
        }
    }
    toPublicUser(user) {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            walletAddress: user.walletAddress,
            createdAt: user.createdAt,
        };
    }
    toCatalogAssociation(association) {
        return {
            id: association.id,
            name: association.name,
            slug: association.slug,
            description: association.description,
            logoUrl: association.logoUrl,
            stripeOnboardingComplete: association.stripeOnboardingComplete,
            stripeCryptoPaymentsActive: association.stripeCryptoPaymentsActive,
            approvedAt: association.approvedAt,
        };
    }
    toPublicAssociation(association) {
        return {
            id: association.id,
            name: association.name,
            slug: association.slug,
            description: association.description,
            logoUrl: association.logoUrl,
            status: association.status,
            stripeConnectAccountId: association.stripeConnectAccountId,
            stripeOnboardingComplete: association.stripeOnboardingComplete,
            stripeCryptoPaymentsActive: association.stripeCryptoPaymentsActive,
            onChainRegistered: association.onChainRegistered,
            approvedAt: association.approvedAt,
            createdAt: association.createdAt,
            updatedAt: association.updatedAt,
        };
    }
};
exports.AssociationsService = AssociationsService;
exports.AssociationsService = AssociationsService = AssociationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        stripe_service_1.StripeService,
        blockchain_service_1.BlockchainService,
        config_1.ConfigService])
], AssociationsService);
//# sourceMappingURL=associations.service.js.map