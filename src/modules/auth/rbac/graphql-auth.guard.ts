/**
 * @file graphql-auth.guard.ts
 * @module modules/auth/rbac
 * @description GraphQL variant of GlobalAuthGuard (verifies access token and enriches claims)
 * @author BharatERP
 * @created 2025-11-16
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AccessTokenGuard } from './access-token.guard';
import { AuthClaimsGuard } from './auth-claims.guard';

@Injectable()
export class GraphqlAuthGuard implements CanActivate {
  constructor(
    private readonly accessToken: AccessTokenGuard,
    private readonly claims: AuthClaimsGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlCtx = GqlExecutionContext.create(context);
    const { req } = gqlCtx.getContext<{ req: any }>();
    // If no request (unlikely), allow
    if (!req) return true;
    // Monkey-patch the HTTP request into the execution context for underlying guards
    const httpCtx = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getType: () => 'http',
    } as unknown as ExecutionContext;

    const ok = await this.accessToken.canActivate(httpCtx);
    if (!ok) return false;
    return this.claims.canActivate(httpCtx);
  }
}


