/**
* File: src/modules/auth/rbac/policy.guard.ts
* Module: modules/auth/rbac
* Purpose: Guard to enforce permission checks using metadata
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Assumes request.user.permissions is string[]
*/

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_METADATA } from './policy.decorator';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const userPerms: string[] = (req?.user?.permissions as string[]) ?? [];
    return required.every((p) => userPerms.includes(p));
  }
}


