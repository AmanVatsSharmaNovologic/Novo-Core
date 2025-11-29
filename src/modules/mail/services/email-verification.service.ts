/**
 * @file email-verification.service.ts
 * @module modules/mail/services
 * @description Service for managing email verification tokens and verification flow
 * @author BharatERP
 * @created 2025-12-01
 */

import { Injectable, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { EmailVerification } from '../entities/email-verification.entity';
import { Identity } from '../../auth/entities/identity.entity';
import { MailService } from './mail.service';
import {
  EmailVerificationExpiredError,
  EmailVerificationInvalidError,
  EmailAlreadyVerifiedError,
  EmailVerificationNotFoundError,
} from '../../../common/errors';
import { LoggerService } from '../../../shared/logger';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../shared/config/config.types';

@Injectable()
export class EmailVerificationService {
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(EmailVerification)
    private readonly verificationRepo: Repository<EmailVerification>,
    @InjectRepository(Identity)
    private readonly identityRepo: Repository<Identity>,
    private readonly mailService: MailService,
    private readonly logger: LoggerService,
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
  ) {}

  /**
   * Generate a cryptographically secure verification token
   */
  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Hash a token for storage in the database
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a verification token and send verification email
   */
  async createVerificationToken(identityId: string, email: string): Promise<string> {
    const childLogger = this.logger.child({ scope: 'email-verification', identityId, email });
    childLogger.debug({ identityId, email }, 'Creating email verification token');

    // Check if identity already has verified email
    const identity = await this.identityRepo.findOne({ where: { id: identityId } });
    if (!identity) {
      throw new Error(`Identity not found: ${identityId}`);
    }

    if (identity.emailVerified) {
      childLogger.info({ identityId }, 'Email already verified');
      throw new EmailAlreadyVerifiedError();
    }

    // Generate token
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    // Invalidate any existing unverified tokens for this identity
    await this.verificationRepo.update(
      { identityId, verifiedAt: null },
      { verifiedAt: new Date(0) }, // Mark as expired/invalid
    );

    // Create new verification record
    const verification = this.verificationRepo.create({
      identityId,
      email,
      tokenHash,
      expiresAt,
    });

    await this.verificationRepo.save(verification);
    childLogger.info({ identityId, verificationId: verification.id }, 'Verification token created');

    // Send verification email
    const verificationUrl = `${this.config.domain.publicBaseUrl}/public/verify-email?token=${rawToken}`;
    try {
      await this.mailService.sendVerificationEmail(email, verificationUrl);
      childLogger.info({ identityId, email }, 'Verification email sent');
    } catch (error) {
      childLogger.error({ err: error, identityId, email }, 'Failed to send verification email');
      // Don't throw - token is created, email can be resent later
    }

    return rawToken;
  }

  /**
   * Verify an email using a token
   */
  async verifyEmail(token: string): Promise<{ identityId: string; email: string }> {
    const childLogger = this.logger.child({ scope: 'email-verification' });
    childLogger.debug({}, 'Verifying email with token');

    const tokenHash = this.hashToken(token);

    // Find verification record
    const verification = await this.verificationRepo.findOne({
      where: { tokenHash },
      relations: ['identity'],
    });

    if (!verification) {
      childLogger.warn({}, 'Verification token not found');
      throw new EmailVerificationNotFoundError();
    }

    // Check if already verified
    if (verification.verifiedAt) {
      childLogger.info({ identityId: verification.identityId }, 'Token already used');
      throw new EmailAlreadyVerifiedError('This verification token has already been used');
    }

    // Check expiration
    if (new Date() > verification.expiresAt) {
      childLogger.warn({ identityId: verification.identityId }, 'Verification token expired');
      throw new EmailVerificationExpiredError();
    }

    // Verify the identity
    const identity = await this.identityRepo.findOne({ where: { id: verification.identityId } });
    if (!identity) {
      childLogger.error({ identityId: verification.identityId }, 'Identity not found during verification');
      throw new EmailVerificationInvalidError('Identity not found');
    }

    if (identity.emailVerified) {
      childLogger.info({ identityId: identity.id }, 'Email already verified for identity');
      // Mark this token as used even though it's redundant
      verification.verifiedAt = new Date();
      await this.verificationRepo.save(verification);
      throw new EmailAlreadyVerifiedError();
    }

    // Update verification record
    verification.verifiedAt = new Date();
    await this.verificationRepo.save(verification);

    // Update identity
    identity.emailVerified = true;
    identity.emailVerifiedAt = new Date();
    // If identity was pending, activate it
    if (identity.status === 'pending') {
      identity.status = 'active';
    }
    await this.identityRepo.save(identity);

    childLogger.info(
      { identityId: identity.id, email: identity.email },
      'Email verified successfully',
    );

    return {
      identityId: identity.id,
      email: identity.email,
    };
  }

  /**
   * Resend verification email for an identity
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const childLogger = this.logger.child({ scope: 'email-verification', email });
    childLogger.debug({ email }, 'Resending verification email');

    // Find identity by email
    const identity = await this.identityRepo.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!identity) {
      // Don't reveal if email exists or not (security best practice)
      childLogger.warn({ email }, 'Identity not found for resend request');
      return; // Silently succeed to prevent email enumeration
    }

    if (identity.emailVerified) {
      childLogger.info({ identityId: identity.id }, 'Email already verified, skipping resend');
      return; // Silently succeed
    }

    // Create new verification token
    await this.createVerificationToken(identity.id, identity.email);
    childLogger.info({ identityId: identity.id, email }, 'Verification email resent');
  }

  /**
   * Check if an identity's email is verified
   */
  async isEmailVerified(identityId: string): Promise<boolean> {
    const identity = await this.identityRepo.findOne({ where: { id: identityId } });
    return identity?.emailVerified ?? false;
  }
}

