/**
 * @file oidc-provider.module.ts
 * @module modules/auth/oidc-provider
 * @description Nest module scaffolding for integrating `oidc-provider` behind a feature flag.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OidcProviderService } from './oidc-provider.service';
import { InteractionsController } from './interactions.controller';
import { OidcStorage } from '../entities/oidc-storage.entity';
import { AppConfigModule } from '../../../shared/config/config.module';
import { LoggerModule } from '../../../shared/logger.module';
import { CryptoModule } from '../../../shared/crypto/crypto.module';
import { DatabaseModule } from '../../../shared/database/database.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    CryptoModule,
    DatabaseModule,
    TypeOrmModule.forFeature([OidcStorage]),
  ],
  providers: [OidcProviderService],
  controllers: [InteractionsController],
  exports: [OidcProviderService],
})
export class OidcProviderModule {}


