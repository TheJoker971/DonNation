import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { DocumentsModule } from '../documents/documents.module';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [BlockchainModule, DocumentsModule],
  controllers: [StripeWebhookController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
