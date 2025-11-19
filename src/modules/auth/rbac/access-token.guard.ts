/**
 * @file access-token.guard.ts
 * @module modules/auth/rbac
 * @description Guard that verifies access tokens (Authorization header or HttpOnly cookie) via JWKS and attaches claims to req.user.
 * @author BharatERP
 * @created 2025-11-08
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwkService } from '../../../shared/crypto/jwk.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwk: JwkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authorization: string | undefined = req.headers?.authorization;
    const headerToken =
      authorization && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : undefined;

    // Prefer Authorization header (API clients), but support HttpOnly cookie `at` for browser flows.
    if (headerToken) {
      const ok = await this.verifyAndAttach(req, headerToken);
      if (ok) return true;
      // If header token is invalid, do not silently fall back to cookie – treat as unauthorized.
      return false;
    }

    const cookieToken: string | undefined = (req.cookies?.at as string | undefined) ?? undefined;
    if (!cookieToken) {
      return false;
    }
    return this.verifyAndAttach(req, cookieToken);
  }

  private async verifyAndAttach(req: any, token: string): Promise<boolean> {
    try {
      const { payload } = await this.jwk.verifyJwt(token);
      // Attach claims to request for downstream guards/controllers
      req.user = payload;
      return true;
    } catch {
      return false;
    }
  }
}

