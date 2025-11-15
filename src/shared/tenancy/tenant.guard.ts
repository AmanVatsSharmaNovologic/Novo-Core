/**
* File: src/shared/tenancy/tenant.guard.ts
* Module: shared/tenancy
* Description: Ensures route/request tenant matches RequestContext or token org_id.
* Author: BharatERP
* @created 2025-11-15
*/

import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RequestContext } from '../request-context';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest();
    const paramsTenant: string | undefined = req?.params?.tenantId;
    const bodyTenant: string | undefined = req?.body?.tenantId;
    const providedTenant = paramsTenant ?? bodyTenant;
    if (!providedTenant) return true;

    const ctxTenant = RequestContext.get()?.tenantId;
    const tokenTenant: string | undefined = (req?.user?.org_id as string | undefined) ?? undefined;
    const expectedTenant = ctxTenant ?? tokenTenant;

    if (expectedTenant && providedTenant && providedTenant !== expectedTenant) {
      throw new HttpException({ code: 'TENANT_MISMATCH', message: 'Tenant scope mismatch' }, HttpStatus.BAD_REQUEST);
    }
    return true;
  }
}


