import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { hashDonationReceipt } from './utils/receipt-hash.util';

@Injectable()
export class DonationMintService {
  private readonly logger = new Logger(DonationMintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly config: ConfigService,
  ) {}

  async mintPaidDonation(donationId: string): Promise<void> {
    if (!this.blockchain.isEnabled()) {
      this.logger.debug(
        `Skipping mint for ${donationId}: blockchain not configured`,
      );
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
      this.logger.warn(
        `Cannot mint ${donationId}: donation or invoice missing`,
      );
      return;
    }

    if (donation.status === DonationStatus.COMPLETED) {
      return;
    }

    if (
      donation.status !== DonationStatus.PAID &&
      donation.status !== DonationStatus.MINTING
    ) {
      this.logger.warn(
        `Cannot mint ${donationId}: status is ${donation.status}`,
      );
      return;
    }

    if (!donation.invoice.externalPaymentIdHash) {
      this.logger.warn(
        `Cannot mint ${donationId}: externalPaymentIdHash missing`,
      );
      return;
    }

    if (!donation.stripePaymentIntentId) {
      this.logger.warn(
        `Cannot mint ${donationId}: stripePaymentIntentId missing`,
      );
      return;
    }

    const mintTo = this.resolveMintRecipient(donation.donor.walletAddress);
    if (!mintTo) {
      this.logger.warn(
        `Cannot mint ${donationId}: no donor wallet and BLOCKCHAIN_CUSTODIAL_WALLET unset`,
      );
      return;
    }

    await this.prisma.donation.update({
      where: { id: donationId },
      data: { status: DonationStatus.MINTING },
    });

    try {
      await this.blockchain.ensureAssociationActive(donation.associationId);

      if (!donation.association.onChainRegistered) {
        await this.prisma.association.update({
          where: { id: donation.associationId },
          data: { onChainRegistered: true },
        });
      }

      const receiptHash = hashDonationReceipt({
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
          where: { id: donation.invoice!.id },
          data: {
            receiptHash,
            tokenId,
            txHash,
            chainId: this.blockchain.getChainId(),
            status: InvoiceStatus.MINTED,
          },
        });

        await tx.donation.update({
          where: { id: donationId },
          data: { status: DonationStatus.COMPLETED, donorWallet: mintTo },
        });
      });

      this.logger.log(
        `Donation ${donationId} minted as token #${tokenId} (${txHash})`,
      );
    } catch (error) {
      this.logger.error(`Mint failed for donation ${donationId}`, error);

      await this.prisma.$transaction(async (tx) => {
        await tx.donation.update({
          where: { id: donationId },
          data: { status: DonationStatus.PAID },
        });

        await tx.invoice.update({
          where: { id: donation.invoice!.id },
          data: { status: InvoiceStatus.FAILED },
        });
      });
    }
  }

  private resolveMintRecipient(donorWallet: string | null): string | null {
    if (donorWallet) {
      return donorWallet;
    }

    return this.config.get<string>('BLOCKCHAIN_CUSTODIAL_WALLET') ?? null;
  }
}
