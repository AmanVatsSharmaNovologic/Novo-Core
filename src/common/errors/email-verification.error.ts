/**
 * @file email-verification.error.ts
 * @module common/errors
 * @description Domain errors for email verification flow
 * @author BharatERP
 * @created 2025-12-01
 */

import { AppError } from './app-error';

export class EmailVerificationExpiredError extends AppError {
  constructor(message = 'Email verification token has expired', cause?: unknown) {
    super('EMAIL_VERIFICATION_EXPIRED', message, cause);
  }
}

export class EmailVerificationInvalidError extends AppError {
  constructor(message = 'Invalid email verification token', cause?: unknown) {
    super('EMAIL_VERIFICATION_INVALID', message, cause);
  }
}

export class EmailAlreadyVerifiedError extends AppError {
  constructor(message = 'Email has already been verified', cause?: unknown) {
    super('EMAIL_ALREADY_VERIFIED', message, cause);
  }
}

export class EmailVerificationNotFoundError extends AppError {
  constructor(message = 'Email verification token not found', cause?: unknown) {
    super('EMAIL_VERIFICATION_NOT_FOUND', message, cause);
  }
}


