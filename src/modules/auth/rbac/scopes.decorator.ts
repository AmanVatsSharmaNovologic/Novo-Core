/**
 * @file scopes.decorator.ts
 * @module modules/auth/rbac
 * @description Decorator to require OAuth2/OIDC scopes on handlers.
 * @author BharatERP
 * @created 2025-11-08
 */

import { SetMetadata } from '@nestjs/common';

export const SCOPES_METADATA = 'required_scopes';
export const RequireScopes = (...scopes: string[]) => SetMetadata(SCOPES_METADATA, scopes);


