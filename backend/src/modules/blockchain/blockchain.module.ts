import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { DonationMintService } from './donation-mint.service';

@Module({
  providers: [BlockchainService, DonationMintService],
  exports: [BlockchainService, DonationMintService],
})
export class BlockchainModule {}
