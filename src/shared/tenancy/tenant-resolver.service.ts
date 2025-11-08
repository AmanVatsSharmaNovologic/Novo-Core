/**
* File: src/shared/tenancy/tenant-resolver.service.ts
* Module: shared/tenancy
* Purpose: Resolve tenantId from headers or host (subdomain) and set RequestContext
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Priority: x-tenant-id header > authenticated principal > subdomain
*/

import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RequestContext } from '../request-context';

@Injectable()
export class TenantResolverService {
  resolveFromRequest(req: Request): string | undefined {
    const headerTenant = (req.headers['x-tenant-id'] as string | undefined)?.trim();
    if (headerTenant) {
      RequestContext.set({ tenantId: headerTenant });
      return headerTenant;
    }
    // Placeholder: if auth adds principal with tenant, prefer that
    const principalTenant = (req as any)?.user?.tenantId as string | undefined;
    if (principalTenant) {
      RequestContext.set({ tenantId: principalTenant });
      return principalTenant;
    }
    // Derive from subdomain: foo.novologic.co => foo
    const host = req.hostname || (req.headers['host'] as string | undefined) || '';
    const parts = host.split('.');
    if (parts.length >= 3) {
      const sub = parts[0];
      if (sub && sub !== 'auth' && sub !== 'www') {
        RequestContext.set({ tenantId: sub });
        return sub;
      }
    }
    return undefined;
  }
}


