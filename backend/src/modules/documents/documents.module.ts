import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  providers: [ReceiptService],
  exports: [ReceiptService],
})
export class DocumentsModule {}
