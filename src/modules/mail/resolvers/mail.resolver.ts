/**
 * @file mail.resolver.ts
 * @module modules/mail/resolvers
 * @description GraphQL resolvers for email verification
 * @author BharatERP
 * @created 2025-12-01
 */

import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { EmailVerificationService } from '../services/email-verification.service';
import { VerifyEmailResult, EmailVerificationStatus } from '../dtos/graphql-types';
import { GraphqlAuthGuard } from '../../auth/rbac/graphql-auth.guard';
import { RequestContext } from '../../../shared/request-context';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Identity } from '../../auth/entities/identity.entity';
import { LoggerService } from '../../../shared/logger';

@Resolver()
export class MailResolver {
  constructor(
    private readonly emailVerification: EmailVerificationService,
    @InjectRepository(Identity)
    private readonly identityRepo: Repository<Identity>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Verify email using a verification token
   */
  @Mutation(() => VerifyEmailResult)
  async verifyEmail(@Args('token', { type: () => String }) token: string): Promise<VerifyEmailResult> {
    const ctx = RequestContext.get();
    const childLogger = this.logger.child({ scope: 'graphql-verify-email', requestId: ctx?.requestId });
    childLogger.debug({}, 'Verifying email via GraphQL');

    try {
      const result = await this.emailVerification.verifyEmail(token);
      childLogger.info({ identityId: result.identityId, email: result.email }, 'Email verified via GraphQL');
      return {
        identityId: result.identityId,
        email: result.email,
        success: true,
      };
    } catch (error) {
      childLogger.error({ err: error }, 'Email verification failed via GraphQL');
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  @Mutation(() => Boolean)
  async resendVerificationEmail(@Args('email', { type: () => String }) email: string): Promise<boolean> {
    const ctx = RequestContext.get();
    const childLogger = this.logger.child({ scope: 'graphql-resend-verification', requestId: ctx?.requestId });
    childLogger.debug({ email }, 'Resending verification email via GraphQL');

    try {
      await this.emailVerification.resendVerificationEmail(email);
      childLogger.info({ email }, 'Verification email resent via GraphQL');
      return true;
    } catch (error) {
      childLogger.error({ err: error, email }, 'Failed to resend verification email via GraphQL');
      throw error;
    }
  }

  /**
   * Check email verification status for the current authenticated user
   */
  @Query(() => EmailVerificationStatus)
  @UseGuards(GraphqlAuthGuard)
  async checkEmailVerificationStatus(): Promise<EmailVerificationStatus> {
    const ctx = RequestContext.get();
    const tenantId = ctx?.tenantId;
    const userId = ctx?.userId;

    if (!tenantId || !userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }

    const childLogger = this.logger.child({ scope: 'graphql-check-verification', requestId: ctx?.requestId });
    childLogger.debug({ userId }, 'Checking email verification status via GraphQL');

    // Find identity by user email (assuming user email matches identity email)
    // In a multi-tenant setup, we need to get the identity from membership
    // For now, we'll use a simplified approach: get user and check identity
    const identity = await this.identityRepo
      .createQueryBuilder('identity')
      .innerJoin('memberships', 'm', 'm.identity_id = identity.id')
      .innerJoin('users', 'u', 'u.id = m.user_id')
      .where('u.id = :userId', { userId })
      .andWhere('u.tenant_id = :tenantId', { tenantId })
      .getOne();

    if (!identity) {
      childLogger.warn({ userId, tenantId }, 'Identity not found for user');
      throw new HttpException({ code: 'IDENTITY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const status: EmailVerificationStatus = {
      verified: identity.emailVerified,
      email: identity.email,
      verifiedAt: identity.emailVerifiedAt?.toISOString(),
    };

    childLogger.info({ userId, verified: identity.emailVerified }, 'Email verification status checked via GraphQL');
    return status;
  }
}

