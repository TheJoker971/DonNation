import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async ensureReceipt(donationId: string): Promise<string | null> {
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
      if (filePath && existsSync(filePath)) {
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

  async ensureReceiptForDonor(donorId: string, donationId: string): Promise<string> {
    const donation = await this.prisma.donation.findFirst({
      where: { id: donationId, donorId },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    const pdfUrl = await this.ensureReceipt(donationId);
    if (!pdfUrl) {
      throw new NotFoundException('Receipt not available yet');
    }

    return pdfUrl;
  }

  async ensureReceiptForAssociation(ownerId: string, donationId: string): Promise<string> {
    const association = await this.prisma.association.findUnique({ where: { ownerId } });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const donation = await this.prisma.donation.findFirst({
      where: { id: donationId, associationId: association.id },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    const pdfUrl = await this.ensureReceipt(donationId);
    if (!pdfUrl) {
      throw new NotFoundException('Receipt not available yet');
    }

    return pdfUrl;
  }

  private async generatePdf(donation: {
    id: string;
    amountEur: number;
    isAnonymous: boolean;
    status: string;
    createdAt: Date;
    stripePaymentIntentId: string | null;
    association: { name: string };
    donor: { email: string; displayName: string | null };
    invoice: {
      id: string;
      tokenId: number | null;
      txHash: string | null;
      receiptHash: string | null;
      status: string;
    };
  }): Promise<string> {
    const receiptsDir = join(process.cwd(), 'uploads', 'receipts');
    mkdirSync(receiptsDir, { recursive: true });

    const filename = `${donation.invoice.id}.pdf`;
    const filePath = join(receiptsDir, filename);
    const publicUrl = `${this.getPublicBaseUrl()}/uploads/receipts/${filename}`;

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);
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
      } else {
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
      doc.fontSize(10).fillColor('#666666').text(
        'Ce document atteste du paiement enregistré sur DonNation. Le reçu certifié blockchain complète cette preuve lorsque le mint NFT est terminé.',
        { align: 'left' },
      );

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    this.logger.log(`Receipt PDF generated for donation ${donation.id}`);
    return publicUrl;
  }

  private getPublicBaseUrl(): string {
    return (
      this.config.get<string>('BACKEND_PUBLIC_URL') ??
      `http://localhost:${this.config.get<number>('PORT', 3000)}`
    );
  }

  private resolveFilePath(pdfUrl: string): string | null {
    const marker = '/uploads/receipts/';
    const index = pdfUrl.indexOf(marker);
    if (index === -1) {
      return null;
    }
    const relative = pdfUrl.slice(index + 1);
    return join(process.cwd(), relative);
  }
}
