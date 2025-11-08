/**
 * @file access-token.guard.ts
 * @module modules/auth/rbac
 * @description Guard that verifies Bearer access token via JWKS and attaches claims to req.user.
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
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return false;
    }
    const token = authorization.slice('Bearer '.length);
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


