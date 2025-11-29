/**
 * @file mail.module.ts
 * @module modules/mail
 * @description Mail module for sending emails across microservices
 * @author BharatERP
 * @created 2025-12-01
 */

import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from './services/mail.service';
import { EmailVerificationService } from './services/email-verification.service';
import { EmailVerification } from './entities/email-verification.entity';
import { Identity } from '../auth/entities/identity.entity';
import { AppConfigModule } from '../../shared/config/config.module';
import { LoggerModule } from '../../shared/logger/logger.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, Identity]),
    AppConfigModule,
    LoggerModule,
  ],
  providers: [MailService, EmailVerificationService],
  exports: [MailService, EmailVerificationService],
})
export class MailModule {}

