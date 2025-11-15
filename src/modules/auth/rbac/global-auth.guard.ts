/**
* File: src/modules/auth/rbac/global-auth.guard.ts
* Module: modules/auth/rbac
* Description: Global guard chaining AccessTokenGuard and AuthClaimsGuard with public route exceptions.
* Author: BharatERP
* @created 2025-11-15
*/

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';
import { AuthClaimsGuard } from './auth-claims.guard';

@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly accessToken: AccessTokenGuard,
    private readonly claims: AuthClaimsGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Only enforce for HTTP contexts; allow others (e.g., GraphQL) unless explicitly protected elsewhere
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest();
    const path: string = req?.path || '';
    if (this.isPublicPath(path)) return true;

    const ok = await this.accessToken.canActivate(context);
    if (!ok) return false;
    return this.claims.canActivate(context);
  }

  private isPublicPath(path: string): boolean {
    return (
      path === '/jwks.json' ||
      path === '/graphql' ||
      path.startsWith('/.well-known') ||
      path.startsWith('/authorize') ||
      path.startsWith('/login') ||
      path.startsWith('/consent') ||
      path.startsWith('/token') ||
      path.startsWith('/introspect') ||
      path.startsWith('/revoke')
    );
  }
}


