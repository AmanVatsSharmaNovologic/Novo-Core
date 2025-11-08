/**
* File: src/modules/auth/oidc/oidc.module.ts
* Module: modules/auth/oidc
* Purpose: OIDC REST endpoints module (JWKS for now)
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Extensible with authorize, token, userinfo, introspect, revoke
*/

import { Module } from '@nestjs/common';
import { JwksController } from './jwks.controller';
import { DiscoveryController } from './discovery.controller';
import { AuthorizeController } from './authorize.controller';
import { TokenController } from './token.controller';
import { UserInfoController } from './userinfo.controller';
import { IntrospectController } from './introspect.controller';
import { RevokeController } from './revoke.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { TokensModule } from '../tokens/tokens.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SessionsModule, TokensModule, AuditModule],
  controllers: [
    JwksController,
    DiscoveryController,
    AuthorizeController,
    TokenController,
    UserInfoController,
    IntrospectController,
    RevokeController,
  ],
})
export class OidcModule {}


