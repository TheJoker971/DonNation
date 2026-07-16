import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssociationStatus,
  DonationStatus,
  InvoiceStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { StripeService } from '../payments/stripe.service';
import { getDonorLevel, getDonorLevelLabel } from './utils/donor-level.util';

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly config: ConfigService,
  ) {}

  async create(donorId: string, dto: CreateDonationDto) {
    const association = await this.prisma.association.findUnique({
      where: { id: dto.associationId },
    });

    if (!association) {
      throw new NotFoundException('Association not found');
    }

    if (association.status !== AssociationStatus.APPROVED) {
      throw new BadRequestException(
        'Association is not approved for donations',
      );
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
          status: DonationStatus.PENDING,
          donorWallet: donor?.walletAddress ?? null,
        },
        include: {
          association: { select: { id: true, name: true, slug: true } },
        },
      });

      const invoice = await tx.invoice.create({
        data: {
          donationId: donation.id,
          status: InvoiceStatus.PENDING,
        },
      });

      return { donation, invoice };
    });

    return {
      donation: this.toPublicDonation(result.donation),
      invoice: this.toPublicInvoice(result.invoice),
    };
  }

  async findMine(donorId: string) {
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

  async findDonorStats(donorId: string) {
    const paidStatuses: DonationStatus[] = [
      DonationStatus.PAID,
      DonationStatus.MINTING,
      DonationStatus.COMPLETED,
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
    const associationsSupported = new Set(donations.map((d) => d.associationId))
      .size;

    return {
      totalDonatedEur,
      totalPoints,
      donationCount: donations.length,
      associationsSupported,
      level: getDonorLevel(totalPoints),
    };
  }

  async createPaymentIntent(donorId: string, donationId: string) {
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
      throw new NotFoundException('Donation not found');
    }

    if (donation.status !== DonationStatus.PENDING) {
      throw new BadRequestException('Donation is not pending payment');
    }

    return this.stripeService.createDonationPaymentIntent(donation);
  }

  async findOneForDonor(donorId: string, donationId: string) {
    const donation = await this.prisma.donation.findFirst({
      where: { id: donationId, donorId },
      include: {
        association: { select: { id: true, name: true, slug: true } },
        invoice: true,
      },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    return {
      ...this.toPublicDonation(donation),
      association: donation.association,
      invoice: donation.invoice ? this.toPublicInvoice(donation.invoice) : null,
    };
  }

  async getNftMetadata(donationId: string): Promise<Record<string, unknown>> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        association: { select: { name: true, slug: true } },
        invoice: {
          select: {
            tokenId: true,
            txHash: true,
            chainId: true,
            pdfUrl: true,
            receiptHash: true,
          },
        },
        donor: { select: { displayName: true } },
      },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    const amountEur = (donation.amountEur / 100).toFixed(2);
    const date = donation.createdAt.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const level = getDonorLevelLabel(getDonorLevel(donation.pointsEarned));
    const tokenId = donation.invoice?.tokenId;
    const txHash = donation.invoice?.txHash;
    const chainId = donation.invoice?.chainId ?? 84532;

    const explorerBase =
      chainId === 84532
        ? 'https://sepolia.basescan.org'
        : 'https://basescan.org';

    const attributes: Array<{ trait_type: string; value: string | number }> = [
      { trait_type: 'Association', value: donation.association.name },
      { trait_type: 'Montant', value: `${amountEur} EUR` },
      { trait_type: 'Date', value: date },
      { trait_type: 'Points gagnés', value: donation.pointsEarned },
      { trait_type: 'Niveau donateur', value: level },
      { trait_type: 'Statut', value: donation.status },
    ];

    if (tokenId !== null && tokenId !== undefined) {
      attributes.push({ trait_type: 'Token ID', value: tokenId });
    }
    if (txHash) {
      attributes.push({
        trait_type: 'Transaction',
        value: `${explorerBase}/tx/${txHash}`,
      });
    }

    const appUrl = this.config.get<string>('APP_URL', '');

    return {
      name: `DonNation – Reçu #${tokenId ?? donationId.slice(0, 8)}`,
      description: `Don de ${amountEur} € à ${donation.association.name}, le ${date}. Niveau donateur : ${level}.`,
      image: appUrl ? `${appUrl}/nft-image.png` : '',
      external_url: appUrl
        ? `${appUrl}/donations/${donationId}/receipt`
        : '',
      ...(donation.invoice?.pdfUrl && {
        animation_url: donation.invoice.pdfUrl,
      }),
      attributes,
    };
  }

  calculatePoints(amountEurCents: number): number {
    return Math.max(1, Math.floor(amountEurCents / 100));
  }

  private toPublicDonation(donation: {
    id: string;
    donorId: string;
    associationId: string;
    amountEur: number;
    pointsEarned: number;
    isAnonymous: boolean;
    status: DonationStatus;
    stripePaymentIntentId: string | null;
    donorWallet: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
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

  private toPublicInvoice(invoice: {
    id: string;
    donationId: string;
    externalPaymentIdHash: string | null;
    receiptHash: string | null;
    tokenId: number | null;
    txHash: string | null;
    chainId: number | null;
    metadataUrl: string | null;
    pdfUrl: string | null;
    status: InvoiceStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
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
}
