/**
* File: src/common/errors/domain-errors.ts
* Module: common/errors
* Purpose: Domain error implementations required by workspace rules
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Centralizes domain-specific error types
*/

import { AppError } from './app-error';

export class OrderValidationError extends AppError {
  constructor(message = 'Order validation failed', cause?: unknown) {
    super('ORDER_VALIDATION_ERROR', message, cause);
  }
}

export class InsufficientMarginError extends AppError {
  constructor(message = 'Insufficient margin', cause?: unknown) {
    super('INSUFFICIENT_MARGIN', message, cause);
  }
}

export class ExchangeDownError extends AppError {
  constructor(message = 'Exchange is currently unavailable', cause?: unknown) {
    super('EXCHANGE_DOWN', message, cause);
  }
}

export class DuplicateOrderError extends AppError {
  constructor(message = 'Duplicate order detected', cause?: unknown) {
    super('DUPLICATE_ORDER', message, cause);
  }
}


