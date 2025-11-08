/**
* File: src/modules/auth/rbac/policy.decorator.ts
* Module: modules/auth/rbac
* Purpose: Decorator to require permissions on handlers
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Use with PolicyGuard
*/

import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_METADATA = 'required_permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_METADATA, permissions);


