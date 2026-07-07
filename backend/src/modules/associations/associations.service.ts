import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AssociationStatus, DonationStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterAssociationDto } from './dto/register-association.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { StripeService } from '../payments/stripe.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { buildUniqueSlug, slugify } from './utils/slug.util';

@Injectable()
export class AssociationsService {
  private readonly logger = new Logger(AssociationsService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly stripeService: StripeService,
    private readonly blockchainService: BlockchainService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterAssociationDto) {
    const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const slug = await this.resolveRegistrationSlug(dto);

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: Role.ASSOCIATION,
          displayName: dto.name,
        },
      });

      const association = await tx.association.create({
        data: {
          ownerId: user.id,
          name: dto.name,
          slug,
          description: dto.description,
          status: AssociationStatus.PENDING,
        },
      });

      return { user, association };
    });

    const payload: JwtPayload = {
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

  async startStripeOnboarding(ownerId: string) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
      include: { owner: true },
    });

    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    let stripeConnectAccountId = association.stripeConnectAccountId;

    if (!stripeConnectAccountId) {
      stripeConnectAccountId = await this.stripeService.createConnectAccount(
        association.id,
        association.owner.email,
      );

      await this.prisma.association.update({
        where: { id: association.id },
        data: { stripeConnectAccountId },
      });
    }

    return this.stripeService.createAccountLink(stripeConnectAccountId, association.id);
  }

  async findPublicCatalog() {
    const associations = await this.prisma.association.findMany({
      where: { status: AssociationStatus.APPROVED },
      orderBy: { name: 'asc' },
    });

    return associations.map((association) => this.toCatalogAssociation(association));
  }

  async findAllForAdmin(status?: AssociationStatus) {
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

  async findMine(ownerId: string) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
      include: { owner: true },
    });

    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    return {
      ...this.toPublicAssociation(association),
      owner: this.toPublicUser(association.owner),
    };
  }

  async approve(associationId: string, adminId: string) {
    return this.updateStatus(associationId, adminId, AssociationStatus.APPROVED);
  }

  async suspend(associationId: string, adminId: string) {
    return this.updateStatus(associationId, adminId, AssociationStatus.SUSPENDED);
  }

  private async updateStatus(
    associationId: string,
    adminId: string,
    status: AssociationStatus,
  ) {
    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
    });

    if (!association) {
      throw new NotFoundException('Association not found');
    }

    if (status === AssociationStatus.APPROVED && association.status === AssociationStatus.APPROVED) {
      throw new ConflictException('Association is already approved');
    }

    if (status === AssociationStatus.SUSPENDED && association.status === AssociationStatus.SUSPENDED) {
      throw new ConflictException('Association is already suspended');
    }

    const updated = await this.prisma.association.update({
      where: { id: associationId },
      data: {
        status,
        approvedAt: status === AssociationStatus.APPROVED ? new Date() : association.approvedAt,
        approvedById: status === AssociationStatus.APPROVED ? adminId : association.approvedById,
      },
    });

    await this.syncAssociationOnChain(associationId, status);

    return this.toPublicAssociation(updated);
  }

  async findReceivedDonations(ownerId: string) {
    const association = await this.prisma.association.findUnique({ where: { ownerId } });
    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    const donations = await this.prisma.donation.findMany({
      where: {
        associationId: association.id,
        status: { in: [DonationStatus.PAID, DonationStatus.MINTING, DonationStatus.COMPLETED] },
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

  async updateLogo(ownerId: string, file: Express.Multer.File) {
    const association = await this.prisma.association.findUnique({ where: { ownerId } });
    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = extname(file.originalname).toLowerCase();
    if (!allowed.includes(extension)) {
      throw new BadRequestException('Logo must be JPG, PNG or WebP');
    }

    const logosDir = join(process.cwd(), 'uploads', 'logos');
    mkdirSync(logosDir, { recursive: true });

    const filename = `${association.id}${extension}`;
    const filePath = join(logosDir, filename);
    writeFileSync(filePath, file.buffer);

    const logoUrl = `${this.getPublicBaseUrl()}/uploads/logos/${filename}`;
    const updated = await this.prisma.association.update({
      where: { id: association.id },
      data: { logoUrl },
    });

    return this.toPublicAssociation(updated);
  }

  private getPublicBaseUrl(): string {
    return (
      this.config.get<string>('BACKEND_PUBLIC_URL') ??
      `http://localhost:${this.config.get<number>('PORT', 3000)}`
    );
  }

  private async resolveRegistrationSlug(dto: RegisterAssociationDto): Promise<string> {
    const base = slugify(dto.name);

    if (base.length < 2) {
      throw new BadRequestException('Association name must contain enough characters to generate a public URL');
    }

    const existing = await this.prisma.association.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });

    return buildUniqueSlug(base, new Set(existing.map((association) => association.slug)));
  }

  private async syncAssociationOnChain(associationId: string, status: AssociationStatus) {
    if (!this.blockchainService.isEnabled()) {
      return;
    }

    try {
      if (status === AssociationStatus.APPROVED) {
        await this.blockchainService.ensureAssociationActive(associationId);
        await this.prisma.association.update({
          where: { id: associationId },
          data: { onChainRegistered: true },
        });
      }

      if (status === AssociationStatus.SUSPENDED) {
        await this.blockchainService.deactivateAssociation(associationId);
      }
    } catch (error) {
      this.logger.error(`On-chain sync failed for association ${associationId}`, error);
    }
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: Role;
    displayName: string | null;
    walletAddress: string | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    };
  }

  private toCatalogAssociation(association: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    stripeOnboardingComplete: boolean;
    approvedAt: Date | null;
  }) {
    return {
      id: association.id,
      name: association.name,
      slug: association.slug,
      description: association.description,
      logoUrl: association.logoUrl,
      stripeOnboardingComplete: association.stripeOnboardingComplete,
      approvedAt: association.approvedAt,
    };
  }

  private toPublicAssociation(association: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    status: AssociationStatus;
    stripeConnectAccountId: string | null;
    stripeOnboardingComplete: boolean;
    onChainRegistered: boolean;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: association.id,
      name: association.name,
      slug: association.slug,
      description: association.description,
      logoUrl: association.logoUrl,
      status: association.status,
      stripeConnectAccountId: association.stripeConnectAccountId,
      stripeOnboardingComplete: association.stripeOnboardingComplete,
      onChainRegistered: association.onChainRegistered,
      approvedAt: association.approvedAt,
      createdAt: association.createdAt,
      updatedAt: association.updatedAt,
    };
  }
}
