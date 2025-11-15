/**
* File: src/modules/common/filters/http-exception.filter.ts
* Module: modules/common/filters
* Purpose: Global HTTP exception filter mapping AppError to status codes
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import { Request, Response } from 'express';
import { LoggerService } from '../../../shared/logger';
import { RequestContext } from '../../../shared/request-context';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = this.resolveStatus(exception);
    const code = this.resolveCode(exception);
    const message = this.resolveMessage(exception);
    const stack = (exception as any)?.stack as string | undefined;
    this.logger.error({ code, status, path: req.path, stack }, message);

    const payload = {
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      code,
      requestId: RequestContext.get()?.requestId,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
    res.status(status).json(payload);
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


