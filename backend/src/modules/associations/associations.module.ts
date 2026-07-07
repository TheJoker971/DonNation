import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AssociationsService } from './associations.service';
import { AssociationsController } from './associations.controller';
import { AdminAssociationsController } from './admin-associations.controller';
import { PaymentsModule } from '../payments/payments.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    PaymentsModule,
    BlockchainModule,
    DocumentsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') as `${number}h`,
        },
      }),
    }),
  ],
  controllers: [AssociationsController, AdminAssociationsController],
  providers: [AssociationsService],
  exports: [AssociationsService],
})
export class AssociationsModule {}
