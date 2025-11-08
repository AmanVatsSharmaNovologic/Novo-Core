/**
* File: src/common/middleware/request-context.middleware.ts
* Module: common/middleware
* Purpose: Attach requestId and initialize request context for each incoming request
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Reads x-request-id if present, else generates UUID v4
* - Exposes requestId as response header for traceability
*/

import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from '../../shared/request-context';
import { TenantResolverService } from '../../shared/tenancy/tenant-resolver.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantResolver: TenantResolverService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const headerId =
      (req.headers['x-request-id'] as string | undefined) ||
      (req.headers['x-correlation-id'] as string | undefined);
    const requestId = headerId || randomUUID();
    // Initialize ALS for the lifecycle of this request
    RequestContext.run({ requestId }, () => {
      res.setHeader('x-request-id', requestId);
      (req as any).requestId = requestId;
      // Resolve and set tenant in RequestContext for downstream consumers
      try {
        this.tenantResolver.resolveFromRequest(req);
      } catch {
        // no-op; resolution is best-effort here
      }
      next();
    });
  }
}


