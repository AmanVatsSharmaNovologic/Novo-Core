/**
* File: src/modules/auth/rbac/auth-claims.guard.ts
* Module: modules/auth/rbac
* Description: Enriches req.user with permissions (DB-only) after token verification.
* Author: BharatERP
* @created 2025-11-15
*/

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequestContext } from '../../../shared/request-context';

@Injectable()
export class AuthClaimsGuard implements CanActivate {
  constructor(private readonly permissions: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req?.user as Record<string, any> | undefined;
    if (!user) return true; // AccessTokenGuard should run before; if not, treat as public

    const sub: string | undefined = user.sub;
    const isClientCredential = typeof sub === 'string' && sub.startsWith('client:');
    if (isClientCredential) {
      // Machine tokens do not have user permissions
      return true;
    }
    const tenantId: string | undefined = (user.org_id as string | undefined) ?? RequestContext.get()?.tenantId;
    if (!tenantId || !sub) return true;

    const perms = await this.permissions.getPermissionsForUser(tenantId, sub);
    if (!Array.isArray(user.permissions)) {
      user.permissions = perms;
    } else {
      const merged = new Set<string>([...user.permissions, ...perms]);
      user.permissions = Array.from(merged);
    }
    // Propagate userId into RequestContext for logging correlation if absent
    if (!RequestContext.get()?.userId) {
      RequestContext.set({ userId: sub });
    }
    return true;
  }
}


