/**
 * @file public-registration.service.ts
 * @module modules/auth/oidc
 * @description Service handling public registration for global identities and platform tenant users.
 * @author BharatERP
 * @created 2025-11-24
 */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { Identity } from '../../entities/identity.entity';
import { User } from '../../entities/user.entity';
import { Membership } from '../../entities/membership.entity';
import { PasswordService } from '../../passwords/services/password.service';
import { ClientService } from '../../clients/services/client.service';
import { LoggerService } from '../../../../shared/logger';
import { EmailVerificationService } from '../../../mail/services/email-verification.service';

@Injectable()
export class PublicRegistrationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly passwords: PasswordService,
    private readonly clients: ClientService,
    private readonly logger: LoggerService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  /**
   * Register a new global identity and, when possible, a platform-tenant user + membership.
   * - Email is normalized (trim + lower-case).
   * - Identity is marked active immediately (simulated email verification).
   * - If a global realm client (app-spa) exists, a User + Membership are created in its tenant.
   */
  async register(email: string, password: string): Promise<{ identityId: string; email: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const childLogger = this.logger.child({ scope: 'public-register', email: normalizedEmail });
    childLogger.debug({ email: normalizedEmail }, 'Starting public registration');

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const identityRepo = runner.manager.getRepository(Identity);
      const userRepo = runner.manager.getRepository(User);
      const membershipRepo = runner.manager.getRepository(Membership);

      const existingIdentity = await identityRepo.findOne({ where: { email: normalizedEmail } });
      if (existingIdentity) {
        childLogger.info({ identityId: existingIdentity.id }, 'Identity already exists');
        throw new HttpException(
          { code: 'IDENTITY_EXISTS', message: 'Identity already exists' },
          HttpStatus.CONFLICT,
        );
      }

      const passwordHash = await this.passwords.hashPassword(password);
      const identity = identityRepo.create({
        email: normalizedEmail,
        passwordHash,
        mfaEnabled: false,
        status: 'pending', // Changed to pending until email is verified
        emailVerified: false,
      });
      const savedIdentity = await identityRepo.save(identity);

      // Resolve platform tenant via global realm client (app-spa)
      const globalClient = await this.clients.findGlobalByClientId('app-spa');
      if (!globalClient) {
        childLogger.error(
          { identityId: savedIdentity.id },
          'Global realm client app-spa not found; skipping platform user/membership linkage',
        );
        await runner.commitTransaction();
        return { identityId: savedIdentity.id, email: savedIdentity.email };
      }

      const platformTenantId = globalClient.tenantId;

      // Check if a user already exists in the platform tenant for this email
      let user = await userRepo.findOne({
        where: { tenantId: platformTenantId, email: normalizedEmail },
      });
      if (user) {
        childLogger.warn(
          { tenantId: platformTenantId, userId: user.id },
          'User already exists in platform tenant; ensuring membership linkage only',
        );
      } else {
        user = userRepo.create({
          tenantId: platformTenantId,
          email: normalizedEmail,
          passwordHash,
          mfaEnabled: false,
          status: 'active',
        });
        user = await userRepo.save(user);
      }

      // Ensure membership exists between identity and platform tenant
      let membership = await membershipRepo.findOne({
        where: {
          identityId: savedIdentity.id,
          tenantId: platformTenantId,
        },
      });
      if (!membership) {
        membership = membershipRepo.create({
          identityId: savedIdentity.id,
          tenantId: platformTenantId,
          userId: user.id,
          status: 'active',
        });
        await membershipRepo.save(membership);
      }

      await runner.commitTransaction();

      // Create and send verification email (outside transaction to avoid blocking)
      try {
        await this.emailVerification.createVerificationToken(savedIdentity.id, normalizedEmail);
        childLogger.info({ identityId: savedIdentity.id }, 'Verification email sent');
      } catch (emailError) {
        // Log but don't fail registration - email can be resent later
        childLogger.error(
          { err: emailError, identityId: savedIdentity.id },
          'Failed to send verification email during registration',
        );
      }

      childLogger.info(
        { identityId: savedIdentity.id, tenantId: platformTenantId, userId: user.id },
        'Public registration completed',
      );

      return { identityId: savedIdentity.id, email: savedIdentity.email };
    } catch (err) {
      await runner.rollbackTransaction();
      // Handle race conditions where two requests try to create the same identity
      // concurrently: surface a clean IDENTITY_EXISTS conflict instead of a 500.
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        this.logger.warn(
          { email: normalizedEmail },
          'Identity unique constraint hit during public registration; treating as existing identity',
        );
        throw new HttpException(
          { code: 'IDENTITY_EXISTS', message: 'Identity already exists' },
          HttpStatus.CONFLICT,
        );
      }
      this.logger.error({ err, email: normalizedEmail }, 'Public registration failed');
      throw err;
    } finally {
      await runner.release();
    }
  }
}


