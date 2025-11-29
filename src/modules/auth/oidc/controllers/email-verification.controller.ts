/**
 * @file email-verification.controller.ts
 * @module modules/auth/oidc
 * @description REST endpoints for email verification
 * @author BharatERP
 * @created 2025-12-01
 */

import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus, Redirect, Res } from '@nestjs/common';
import { Response } from 'express';
import { EmailVerificationService } from '../../../mail/services/email-verification.service';
import { LoggerService } from '../../../../shared/logger';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../../shared/config/config.types';
import { Inject } from '@nestjs/common';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  email!: string;
}

@Controller('/public')
export class EmailVerificationController {
  constructor(
    private readonly emailVerification: EmailVerificationService,
    private readonly logger: LoggerService,
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
  ) {}

  /**
   * Verify email using token from query parameter
   * Redirects to frontend success/error page
   */
  @Get('/verify-email')
  @HttpCode(HttpStatus.FOUND)
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const childLogger = this.logger.child({ scope: 'verify-email-endpoint' });
    childLogger.debug({}, 'Email verification request received');

    if (!token) {
      childLogger.warn({}, 'Missing token parameter');
      // Redirect to frontend error page
      const errorUrl = `${this.config.domain.publicBaseUrl.replace('api.', '')}/auth/verify-email?error=missing_token`;
      res.redirect(errorUrl);
      return;
    }

    try {
      const result = await this.emailVerification.verifyEmail(token);
      childLogger.info({ identityId: result.identityId, email: result.email }, 'Email verified successfully');
      
      // Redirect to frontend success page
      const successUrl = `${this.config.domain.publicBaseUrl.replace('api.', '')}/auth/verify-email?success=true&email=${encodeURIComponent(result.email)}`;
      res.redirect(successUrl);
    } catch (error) {
      childLogger.error({ err: error }, 'Email verification failed');
      
      // Determine error type and redirect accordingly
      let errorCode = 'invalid_token';
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorCode = 'expired';
        } else if (error.message.includes('already')) {
          errorCode = 'already_verified';
        }
      }
      
      const errorUrl = `${this.config.domain.publicBaseUrl.replace('api.', '')}/auth/verify-email?error=${errorCode}`;
      res.redirect(errorUrl);
    }
  }

  /**
   * Resend verification email
   */
  @Post('/resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: ResendVerificationDto): Promise<{ success: boolean; message: string }> {
    const childLogger = this.logger.child({ scope: 'resend-verification-endpoint' });
    childLogger.debug({ email: body.email }, 'Resend verification request received');

    try {
      await this.emailVerification.resendVerificationEmail(body.email);
      childLogger.info({ email: body.email }, 'Verification email resent');
      return {
        success: true,
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    } catch (error) {
      childLogger.error({ err: error, email: body.email }, 'Failed to resend verification email');
      // Still return success to prevent email enumeration
      return {
        success: true,
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    }
  }
}

