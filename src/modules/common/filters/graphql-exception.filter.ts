/**
* File: src/modules/common/filters/graphql-exception.filter.ts
* Module: modules/common/filters
* Purpose: Global GraphQL exception filter aligning AppError/HttpException mapping with HTTP filter while logging requestId.
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-30
* Notes:
* - Logs all GraphQL errors with stack + requestId for traceability.
* - Normalizes AppError into HttpException so Yoga/Nest can format consistently.
*/

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { AppError } from '../../../common/errors';
import { LoggerService } from '../../../shared/logger';
import { RequestContext } from '../../../shared/request-context';

@Catch()
export class GraphqlExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): unknown {
    // Only handle GraphQL contexts here; let other filters handle HTTP.
    if (host.getType() !== 'graphql') {
      // Re-throw so HTTP filter and other handlers can process it.
      throw exception as any;
    }

    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();
    const pathKey = info?.path?.key?.toString() ?? info?.fieldName ?? 'unknown';
    const status = this.resolveStatus(exception);
    const code = this.resolveCode(exception);
    const message = this.resolveMessage(exception);
    const stack = (exception as any)?.stack as string | undefined;

    this.logger.error(
      {
        code,
        status,
        path: pathKey,
        stack,
        requestId: RequestContext.get()?.requestId,
      },
      message,
    );

    // If this is already an HttpException, let the GraphQL adapter format it.
    if (exception instanceof HttpException) {
      return exception;
    }

    // Map AppError into HttpException so GraphQL clients see a consistent shape.
    if (exception instanceof AppError) {
      return new HttpException({ code, message }, status);
    }

    // For unexpected errors, wrap into a generic 500 while preserving message.
    return new HttpException({ code: 'UNHANDLED_EXCEPTION', message }, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception instanceof AppError) {
      switch (exception.code) {
        case 'INVALID_GRANT':
        case 'INVALID_CLIENT':
          return HttpStatus.BAD_REQUEST;
        case 'UNAUTHORIZED':
          return HttpStatus.UNAUTHORIZED;
        case 'FORBIDDEN':
          return HttpStatus.FORBIDDEN;
        case 'TENANT_MISMATCH':
          return HttpStatus.BAD_REQUEST;
        case 'ORDER_VALIDATION_ERROR':
          return HttpStatus.BAD_REQUEST;
        case 'INSUFFICIENT_MARGIN':
          return HttpStatus.UNPROCESSABLE_ENTITY;
        case 'EXCHANGE_DOWN':
          return HttpStatus.SERVICE_UNAVAILABLE;
        case 'DUPLICATE_ORDER':
          return HttpStatus.CONFLICT;
        case 'EMAIL_VERIFICATION_EXPIRED':
          return HttpStatus.GONE;
        case 'EMAIL_VERIFICATION_INVALID':
        case 'EMAIL_VERIFICATION_NOT_FOUND':
          return HttpStatus.BAD_REQUEST;
        case 'EMAIL_ALREADY_VERIFIED':
          return HttpStatus.CONFLICT;
        default:
          return HttpStatus.BAD_REQUEST;
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveCode(exception: unknown): string {
    if (exception instanceof AppError) return exception.code;
    if (exception instanceof HttpException) return (exception.getResponse() as any)?.code ?? 'HTTP_EXCEPTION';
    return 'UNHANDLED_EXCEPTION';
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (typeof resp === 'string') return resp;
      if (resp && typeof resp === 'object' && 'message' in resp) return (resp as any).message as string;
      return exception.message;
    }
    if (exception instanceof Error) return exception.message;
    return 'An unexpected error occurred';
  }
}



