import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class ReceiptService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    ensureReceipt(donationId: string): Promise<string | null>;
    ensureReceiptForDonor(donorId: string, donationId: string): Promise<string>;
    ensureReceiptForAssociation(ownerId: string, donationId: string): Promise<string>;
    private generatePdf;
    private getPublicBaseUrl;
    private resolveFilePath;
}
