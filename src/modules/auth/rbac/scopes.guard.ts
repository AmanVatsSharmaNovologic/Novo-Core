/**
 * @file scopes.guard.ts
 * @module modules/auth/rbac
 * @description Guard to enforce required scopes present in access token claims.
 * @author BharatERP
 * @created 2025-11-08
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_METADATA } from './scopes.decorator';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(SCOPES_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const scopeStr: string = (req?.user?.scope as string) ?? '';
    const granted = new Set(scopeStr.split(/\s+/).filter(Boolean));
    return required.every((s) => granted.has(s));
  }
}


