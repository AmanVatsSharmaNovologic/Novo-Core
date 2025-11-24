/**
 * @file tenant-resolver.service.ts
 * @module shared/tenancy
 * @description Resolve tenantId from headers, query, or host (subdomain) and set RequestContext
 * @author BharatERP
 * @created 2025-11-08
 * @updated 2025-11-24 (IST) - Support x-tenant-id/tenant_id query params and avoid treating "api" as a tenant.
 *
 * Notes:
 * - Priority: x-tenant-id header > authenticated principal > x-tenant-id/tenant_id query param > subdomain
 */

import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RequestContext } from '../request-context';

@Injectable()
export class TenantResolverService {
  resolveFromRequest(req: Request): string | undefined {
    const applyTenant = (value: string | undefined): string | undefined => {
      const tenantId = value?.trim();
      if (!tenantId) {
        return undefined;
      }
      RequestContext.set({ tenantId });
      return tenantId;
    };

    const headerTenant = req.headers['x-tenant-id'] as string | undefined;
    const headerResolved = applyTenant(headerTenant);
    if (headerResolved) {
      return headerResolved;
    }

    // Placeholder: if auth adds principal with tenant, prefer that
    const principalTenant = (req as any)?.user?.tenantId as string | undefined;
    const principalResolved = applyTenant(principalTenant);
    if (principalResolved) {
      return principalResolved;
    }

    // Allow tenant to be provided via query string for browser redirects:
    // - /authorize?x-tenant-id=<uuid>
    // - /authorize?tenant_id=<uuid>
    const query = req.query || {};
    const queryTenantRaw =
      (query['x-tenant-id'] as string | undefined) ??
      (query['x_tenant_id'] as string | undefined) ??
      (query['tenant_id'] as string | undefined) ??
      (query['tenantId'] as string | undefined);
    const queryResolved = applyTenant(queryTenantRaw);
    if (queryResolved) {
      return queryResolved;
    }

    // Derive from subdomain: foo.novologic.co => foo
    // Special-case infra hosts like auth.novologic.co and api.novologic.co:
    // - We should never treat "auth" or "api" (or "www") as tenant slugs.
    const host = req.hostname || (req.headers['host'] as string | undefined) || '';
    const parts = host.split('.');
    if (parts.length >= 3) {
      const sub = parts[0];
      if (sub && sub !== 'auth' && sub !== 'www' && sub !== 'api') {
        return applyTenant(sub);
      }
    }
    return undefined;
  }
}


