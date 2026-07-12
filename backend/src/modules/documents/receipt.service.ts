import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

type ReceiptDonation = {
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
    chainId: number | null;
    status: string;
  };
};

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  // Brand palette (matches frontend Tailwind config)
  private readonly navy = '#0f172a';
  private readonly navyLight = '#1e293b';
  private readonly green = '#059669';
  private readonly greenLight = '#d1fae5';
  private readonly greenDark = '#065f46';
  private readonly slate = '#64748b';
  private readonly slateLight = '#f8fafc';
  private readonly slateBorder = '#e2e8f0';
  private readonly textDark = '#0f172a';
  private readonly textMuted = '#64748b';

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

    // Always regenerate to pick up the latest design
    // (remove the early-return cache check so new receipts use the updated template)

    if (donation.status === 'PENDING' || donation.status === 'CANCELLED') {
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

  async ensureReceiptForDonor(
    donorId: string,
    donationId: string,
  ): Promise<string> {
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

  async ensureReceiptForAssociation(
    ownerId: string,
    donationId: string,
  ): Promise<string> {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
    });
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

  private async generatePdf(donation: ReceiptDonation): Promise<string> {
    const receiptsDir = join(process.cwd(), 'uploads', 'receipts');
    mkdirSync(receiptsDir, { recursive: true });

    const filename = `${donation.invoice.id}.pdf`;
    const filePath = join(receiptsDir, filename);
    const publicUrl = `${this.getPublicBaseUrl()}/uploads/receipts/${filename}`;

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      const W = 595.28;

      this.drawHeader(doc, W, donation);
      this.drawAmountHero(doc, W, donation);
      this.drawInfoSection(doc, W, donation);
      this.drawBlockchainSection(doc, W, donation);
      this.drawPageFooter(doc, W);

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    this.logger.log(`Receipt PDF generated for donation ${donation.id}`);
    return publicUrl;
  }

  // ─── Header band ─────────────────────────────────────────────────────────────

  private drawHeader(
    doc: InstanceType<typeof PDFDocument>,
    W: number,
    donation: ReceiptDonation,
  ): void {
    // Dark band
    doc.rect(0, 0, W, 108).fill(this.navy);

    // Brand name
    doc
      .fillColor('#ffffff')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('DonNation', 40, 30, { lineBreak: false });

    // Tagline
    doc
      .fillColor('#94a3b8')
      .fontSize(10)
      .font('Helvetica')
      .text('Reçu officiel de donation', 40, 68, { lineBreak: false });

    // Green accent bar left
    doc.rect(0, 0, 5, 108).fill(this.green);

    // Date top-right
    const dateStr = donation.createdAt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    doc
      .fillColor('#94a3b8')
      .fontSize(9)
      .font('Helvetica')
      .text(dateStr, W - 200, 44, {
        width: 160,
        align: 'right',
        lineBreak: false,
      });

    // Blockchain badge top-right
    doc.rect(W - 138, 22, 98, 16).fill(this.green);
    doc
      .fillColor('#ffffff')
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .text('CERTIFIÉ BLOCKCHAIN', W - 136, 26, {
        width: 94,
        align: 'center',
        lineBreak: false,
      });
  }

  // ─── Amount hero ──────────────────────────────────────────────────────────────

  private drawAmountHero(
    doc: InstanceType<typeof PDFDocument>,
    W: number,
    donation: ReceiptDonation,
  ): void {
    const y = 108;
    doc.rect(0, y, W, 88).fill(this.greenLight);

    const amount = `${(donation.amountEur / 100).toFixed(2)} €`;

    doc
      .fillColor(this.greenDark)
      .fontSize(10)
      .font('Helvetica')
      .text('MONTANT DU DON', 0, y + 18, {
        align: 'center',
        width: W,
        lineBreak: false,
      });
    doc
      .fillColor(this.greenDark)
      .fontSize(36)
      .font('Helvetica-Bold')
      .text(amount, 0, y + 34, { align: 'center', width: W, lineBreak: false });

    // Separator line
    doc
      .moveTo(0, y + 88)
      .lineTo(W, y + 88)
      .strokeColor(this.slateBorder)
      .lineWidth(1)
      .stroke();
  }

  // ─── Info section ─────────────────────────────────────────────────────────────

  private drawInfoSection(
    doc: InstanceType<typeof PDFDocument>,
    W: number,
    donation: ReceiptDonation,
  ): void {
    const top = 196;
    const pad = 40;
    const colW = (W - pad * 2) / 2 - 16;

    doc.rect(0, top, W, 172).fill(this.slateLight);

    // Section title
    doc
      .fillColor(this.textDark)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('DÉTAILS DU DON', pad, top + 22, { lineBreak: false });
    doc
      .moveTo(pad, top + 36)
      .lineTo(W - pad, top + 36)
      .strokeColor(this.slateBorder)
      .lineWidth(0.5)
      .stroke();

    // Left column
    const leftRows: [string, string][] = [
      ['Association', donation.association.name],
      [
        'Date',
        donation.createdAt.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      ],
      ['Référence', donation.id.substring(0, 18) + '…'],
    ];

    // Right column
    const donorName = donation.isAnonymous
      ? 'Anonyme'
      : (donation.donor.displayName ?? donation.donor.email.split('@')[0]);

    const rightRows: [string, string][] = [
      ['Donateur', donorName],
      ['Statut', this.translateStatus(donation.status)],
    ];

    if (donation.stripePaymentIntentId) {
      rightRows.push([
        'Réf. paiement',
        donation.stripePaymentIntentId.substring(0, 22) + '…',
      ]);
    }

    const rowH = 26;
    const rowTop = top + 46;

    leftRows.forEach(([label, value], i) => {
      const y = rowTop + i * rowH;
      doc
        .fillColor(this.textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text(label.toUpperCase(), pad, y, { lineBreak: false });
      doc
        .fillColor(this.textDark)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(value, pad, y + 10, { width: colW, lineBreak: false });
    });

    const rightX = pad + colW + 32;
    rightRows.forEach(([label, value], i) => {
      const y = rowTop + i * rowH;
      doc
        .fillColor(this.textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text(label.toUpperCase(), rightX, y, { lineBreak: false });
      doc
        .fillColor(this.textDark)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(value, rightX, y + 10, { width: colW, lineBreak: false });
    });

    // Divider between sections
    doc
      .moveTo(0, top + 172)
      .lineTo(W, top + 172)
      .strokeColor(this.slateBorder)
      .lineWidth(1)
      .stroke();
  }

  // ─── Blockchain section ───────────────────────────────────────────────────────

  private drawBlockchainSection(
    doc: InstanceType<typeof PDFDocument>,
    W: number,
    donation: ReceiptDonation,
  ): void {
    const top = 368;
    const pad = 40;

    doc.rect(0, top, W, 200).fill('#ffffff');

    // Title row
    doc.rect(pad, top + 22, 3, 16).fill(this.green);
    doc
      .fillColor(this.textDark)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('CERTIFICATION BLOCKCHAIN', pad + 10, top + 22, {
        lineBreak: false,
      });

    doc
      .fillColor(this.textMuted)
      .fontSize(9)
      .font('Helvetica')
      .text(
        'Ces données sont enregistrées de façon permanente et infalsifiable sur la blockchain.',
        pad,
        top + 44,
        { width: W - pad * 2, lineBreak: false },
      );

    doc
      .moveTo(pad, top + 58)
      .lineTo(W - pad, top + 58)
      .strokeColor(this.slateBorder)
      .lineWidth(0.5)
      .stroke();

    const rows: [string, string][] = [
      ['Statut NFT', this.translateInvoiceStatus(donation.invoice.status)],
    ];

    if (donation.invoice.tokenId != null) {
      rows.push(['Token ID', `#${donation.invoice.tokenId}`]);
    }
    if (donation.invoice.chainId != null) {
      rows.push(['Réseau (Chain ID)', String(donation.invoice.chainId)]);
    }
    if (donation.invoice.txHash) {
      rows.push(['Hash transaction', donation.invoice.txHash]);
    }
    if (donation.invoice.receiptHash) {
      rows.push(['Hash du reçu', donation.invoice.receiptHash]);
    }

    let curY = top + 68;
    const colLabelW = 120;

    for (const [label, value] of rows) {
      doc
        .fillColor(this.textMuted)
        .fontSize(8.5)
        .font('Helvetica')
        .text(label, pad, curY, { width: colLabelW, lineBreak: false });

      const isHash = value.startsWith('0x');
      doc
        .fillColor(isHash ? this.slate : this.textDark)
        .fontSize(isHash ? 7.5 : 9)
        .font(isHash ? 'Helvetica' : 'Helvetica-Bold')
        .text(value, pad + colLabelW + 8, curY, {
          width: W - pad * 2 - colLabelW - 8,
          lineBreak: false,
        });

      curY += 20;
    }
  }

  // ─── Page footer ─────────────────────────────────────────────────────────────

  private drawPageFooter(
    doc: InstanceType<typeof PDFDocument>,
    W: number,
  ): void {
    const footerY = 792;
    doc.rect(0, footerY, W, 50).fill(this.navyLight);

    doc
      .fillColor('#94a3b8')
      .fontSize(7.5)
      .font('Helvetica')
      .text(
        'Ce document atteste du paiement enregistré sur DonNation. Conservez-le pour vos archives.',
        40,
        footerY + 10,
        { width: W - 200, lineBreak: false },
      );

    const genDate = new Date().toLocaleDateString('fr-FR');
    doc
      .fillColor('#64748b')
      .fontSize(7.5)
      .font('Helvetica')
      .text(`Généré le ${genDate}`, W - 140, footerY + 10, {
        width: 100,
        align: 'right',
        lineBreak: false,
      });

    doc
      .fillColor('#475569')
      .fontSize(7.5)
      .font('Helvetica')
      .text('DonNation — donnation.io', 40, footerY + 26, {
        width: W - 80,
        align: 'center',
        lineBreak: false,
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'En attente',
      PAID: 'Payé',
      MINTING: 'Certification en cours',
      COMPLETED: 'Certifié',
      FAILED: 'Échoué',
      CANCELLED: 'Annulé',
    };
    return map[status] ?? status;
  }

  private translateInvoiceStatus(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'En attente',
      MINTED: 'NFT émis',
      FAILED: 'Échec',
    };
    return map[status] ?? status;
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
