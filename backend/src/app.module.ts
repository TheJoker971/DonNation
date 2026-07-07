import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AssociationsModule } from './modules/associations/associations.module';
import { DonationsModule } from './modules/donations/donations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    AssociationsModule,
    DonationsModule,
    PaymentsModule,
    BlockchainModule,
    DocumentsModule,
    // Phase 9+: admin dashboards
  ],
})
export class AppModule {}
