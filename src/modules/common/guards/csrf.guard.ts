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
    // Prefer parsed cookies (when cookie-parser is present), but fall back to
    // manual parsing of the Cookie header so we do not depend on middleware
    // ordering in production.
    let cookieToken: string | undefined = (req.cookies?.csrf as string | undefined) ?? undefined;
    if (!cookieToken) {
      const raw: string | undefined = req.headers['cookie'] as string | undefined;
      if (raw) {
        const parts = raw.split(';');
        for (const part of parts) {
          const [k, ...rest] = part.split('=');
          if (k && k.trim() === 'csrf') {
            cookieToken = rest.join('=').trim();
            break;
          }
        }
      }
    }
    const headerToken: string | undefined = (req.headers['x-csrf-token'] as string | undefined) ?? undefined;
    const bodyToken: string | undefined = (req.body?.csrf_token as string | undefined) ?? undefined;
    if (!cookieToken) {
      return false;
    }
    if (headerToken && headerToken === cookieToken) {
      return true;
    }
    if (bodyToken && bodyToken === cookieToken) {
      return true;
    }
    return false;
  }
}


