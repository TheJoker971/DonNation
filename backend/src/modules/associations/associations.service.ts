import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AssociationStatus, DonationStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterAssociationDto } from './dto/register-association.dto';
import { UpdateAssociationDto } from './dto/update-association.dto';
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
    const emailTaken = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
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

    return this.stripeService.createAccountLink(
      stripeConnectAccountId,
      association.id,
    );
  }

  async findPublicCatalog() {
    const associations = await this.prisma.association.findMany({
      where: { status: AssociationStatus.APPROVED },
      orderBy: { name: 'asc' },
    });

    const statsByAssociation = await this.loadAssociationStats(
      associations.map((a) => a.id),
    );

    return associations.map((association) => ({
      ...this.toCatalogAssociation(association),
      stats:
        statsByAssociation.get(association.id) ?? this.emptyAssociationStats(),
    }));
  }

  async findPublicBySlug(slug: string) {
    const association = await this.prisma.association.findFirst({
      where: { slug, status: AssociationStatus.APPROVED },
      include: { photos: { orderBy: { order: 'asc' } } },
    });

    if (!association) {
      throw new NotFoundException('Association not found');
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
        donor: { select: { displayName: true, email: true } },
      },
    });

    return {
      ...this.toCatalogAssociation(association),
      onChainRegistered: association.onChainRegistered,
      stats,
      photos: association.photos.map((p) => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
      })),
      recentSupporters: recentDonations.map((donation) => ({
        displayName: donation.isAnonymous
          ? 'Donateur anonyme'
          : donation.donor.displayName ||
            donation.donor.email?.split('@')[0] ||
            'Donateur',
        amountEur: donation.amountEur,
        createdAt: donation.createdAt,
      })),
    };
  }

  private getPaidDonationStatuses(): DonationStatus[] {
    return [
      DonationStatus.PAID,
      DonationStatus.MINTING,
      DonationStatus.COMPLETED,
    ];
  }

  private emptyAssociationStats() {
    return {
      totalRaisedEur: 0,
      donationCount: 0,
      donorCount: 0,
    };
  }

  private async loadAssociationStats(associationIds: string[]) {
    if (associationIds.length === 0) {
      return new Map<string, ReturnType<typeof this.emptyAssociationStats>>();
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

    const donorCountByAssociation = new Map<string, number>();
    for (const row of donorGroups) {
      donorCountByAssociation.set(
        row.associationId,
        (donorCountByAssociation.get(row.associationId) ?? 0) + 1,
      );
    }

    const statsMap = new Map<
      string,
      ReturnType<typeof this.emptyAssociationStats>
    >();
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
      publicProfileUrl: this.buildPublicProfileUrl(association.slug),
    };
  }

  async updateMine(ownerId: string, dto: UpdateAssociationDto) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
    });
    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    const updated = await this.prisma.association.update({
      where: { id: association.id },
      data: {
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
      },
      include: { owner: true },
    });

    return {
      ...this.toPublicAssociation(updated),
      owner: this.toPublicUser(updated.owner),
      publicProfileUrl: this.buildPublicProfileUrl(updated.slug),
    };
  }

  private buildPublicProfileUrl(slug: string): string {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    return `${appUrl.replace(/\/$/, '')}/associations/${slug}`;
  }

  async approve(associationId: string, adminId: string) {
    return this.updateStatus(
      associationId,
      adminId,
      AssociationStatus.APPROVED,
    );
  }

  async suspend(associationId: string, adminId: string) {
    return this.updateStatus(
      associationId,
      adminId,
      AssociationStatus.SUSPENDED,
    );
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

    if (
      status === AssociationStatus.APPROVED &&
      association.status === AssociationStatus.APPROVED
    ) {
      throw new ConflictException('Association is already approved');
    }

    if (
      status === AssociationStatus.SUSPENDED &&
      association.status === AssociationStatus.SUSPENDED
    ) {
      throw new ConflictException('Association is already suspended');
    }

    const updated = await this.prisma.association.update({
      where: { id: associationId },
      data: {
        status,
        approvedAt:
          status === AssociationStatus.APPROVED
            ? new Date()
            : association.approvedAt,
        approvedById:
          status === AssociationStatus.APPROVED
            ? adminId
            : association.approvedById,
      },
    });

    await this.syncAssociationOnChain(associationId, status);

    return this.toPublicAssociation(updated);
  }

  async findReceivedDonations(ownerId: string) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
    });
    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    const donations = await this.prisma.donation.findMany({
      where: {
        associationId: association.id,
        status: {
          in: [
            DonationStatus.PAID,
            DonationStatus.MINTING,
            DonationStatus.COMPLETED,
          ],
        },
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

  async addPhotos(
    ownerId: string,
    files: Express.Multer.File[],
    captions: string[],
  ) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
    });
    if (!association) throw new NotFoundException('Association not found');

    const photosDir = join(process.cwd(), 'uploads', 'photos');
    mkdirSync(photosDir, { recursive: true });

    const currentCount = await this.prisma.associationPhoto.count({
      where: { associationId: association.id },
    });
    if (currentCount + files.length > 10) {
      throw new BadRequestException('Maximum 10 photos per association');
    }

    const created = await Promise.all(
      files.map(async (file, i) => {
        const ext = extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `${association.id}-${Date.now()}-${i}${ext}`;
        writeFileSync(join(photosDir, filename), file.buffer);
        const url = `${this.getPublicBaseUrl()}/uploads/photos/${filename}`;
        return this.prisma.associationPhoto.create({
          data: {
            associationId: association.id,
            url,
            caption: captions[i] ?? null,
            order: currentCount + i,
          },
        });
      }),
    );

    return created;
  }

  async deletePhoto(ownerId: string, photoId: string) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
    });
    if (!association) throw new NotFoundException('Association not found');

    const photo = await this.prisma.associationPhoto.findFirst({
      where: { id: photoId, associationId: association.id },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    await this.prisma.associationPhoto.delete({ where: { id: photoId } });
    return { deleted: true };
  }

  async updateLogo(ownerId: string, file: Express.Multer.File) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
    });
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

  private async resolveRegistrationSlug(
    dto: RegisterAssociationDto,
  ): Promise<string> {
    const base = slugify(dto.name);

    if (base.length < 2) {
      throw new BadRequestException(
        'Association name must contain enough characters to generate a public URL',
      );
    }

    const existing = await this.prisma.association.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });

    return buildUniqueSlug(
      base,
      new Set(existing.map((association) => association.slug)),
    );
  }

  private async syncAssociationOnChain(
    associationId: string,
    status: AssociationStatus,
  ) {
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
      this.logger.error(
        `On-chain sync failed for association ${associationId}`,
        error,
      );
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
    stripeCryptoPaymentsActive: boolean;
    approvedAt: Date | null;
  }) {
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

  private toPublicAssociation(association: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    status: AssociationStatus;
    stripeConnectAccountId: string | null;
    stripeOnboardingComplete: boolean;
    stripeCryptoPaymentsActive: boolean;
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
      stripeCryptoPaymentsActive: association.stripeCryptoPaymentsActive,
      onChainRegistered: association.onChainRegistered,
      approvedAt: association.approvedAt,
      createdAt: association.createdAt,
      updatedAt: association.updatedAt,
    };
  }
}
