/**
* File: src/modules/common/guards/csrf.guard.ts
* Module: modules/common/guards
* Description: Double-submit cookie CSRF protection for form POSTs.
* Author: BharatERP
* @created 2025-11-15
*/

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest();
    const cookieToken: string | undefined = (req.cookies?.csrf as string | undefined) ?? undefined;
    const headerToken: string | undefined = (req.headers['x-csrf-token'] as string | undefined) ?? undefined;
    const bodyToken: string | undefined = (req.body?.csrf_token as string | undefined) ?? undefined;
    if (!cookieToken) return false;
    if (headerToken && headerToken === cookieToken) return true;
    if (bodyToken && bodyToken === cookieToken) return true;
    return false;
  }
}


