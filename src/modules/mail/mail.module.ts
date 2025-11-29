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
import { LoggerModule } from '../../shared/logger.module';
import { MailResolver } from './resolvers/mail.resolver';
import { User } from '../auth/entities/user.entity';
import { Membership } from '../auth/entities/membership.entity';
import { RbacModule } from '../auth/rbac/rbac.module';
import { GraphqlAuthGuard } from '../auth/rbac/graphql-auth.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, Identity, User, Membership]),
    AppConfigModule,
    LoggerModule,
    RbacModule, // Required for GraphqlAuthGuard dependencies
  ],
  providers: [MailService, EmailVerificationService, MailResolver, GraphqlAuthGuard],
  exports: [MailService, EmailVerificationService],
})
export class MailModule {}

