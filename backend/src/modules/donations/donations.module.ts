import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { DonationsPublicController } from './donations-public.controller';
import { PaymentsModule } from '../payments/payments.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [PaymentsModule, DocumentsModule],
  controllers: [DonationsController, DonationsPublicController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
