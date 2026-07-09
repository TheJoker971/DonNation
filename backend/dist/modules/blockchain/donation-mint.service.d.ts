import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
export declare class DonationMintService {
    private readonly prisma;
    private readonly blockchain;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, blockchain: BlockchainService, config: ConfigService);
    mintPaidDonation(donationId: string): Promise<void>;
    private resolveMintRecipient;
}
