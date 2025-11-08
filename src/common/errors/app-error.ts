/**
* File: src/common/errors/app-error.ts
* Module: common/errors
* Purpose: Base AppError class with code for domain-specific error handling
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - All custom errors must extend AppError
* - code is used by ExceptionFilter for mapping to HTTP status codes
*/

export class AppError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = cause;
    Error.captureStackTrace?.(this, new.target);
  }
}


