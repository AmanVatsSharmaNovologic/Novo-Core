/**
* File: src/modules/auth/auth.module.ts
* Module: modules/auth
* Purpose: Root AuthModule aggregating OIDC, Sessions, Clients, Passwords, MFA, RBAC, Tokens, Management, and Audit
* Author: npm i @apollo/server
* Last-updated: 2025-11-08
*/

import { Module } from '@nestjs/common';
import { OidcModule } from './oidc/oidc.module';
import { SessionsModule } from './sessions/sessions.module';
import { ClientsModule } from './clients/clients.module';
import { PasswordsModule } from './passwords/passwords.module';
import { MfaModule } from './mfa/mfa.module';
import { RbacModule } from './rbac/rbac.module';
import { TokensModule } from './tokens/tokens.module';
import { ManagementModule } from './management/management.module';
import { AuditModule } from './audit/audit.module';
import { OidcProviderModule } from './oidc-provider/oidc-provider.module';

@Module({
  imports: [
    OidcModule,
    OidcProviderModule,
    SessionsModule,
    ClientsModule,
    PasswordsModule,
    MfaModule,
    RbacModule,
    TokensModule,
    ManagementModule,
    AuditModule,
  ],
  exports: [
    OidcModule,
    OidcProviderModule,
    SessionsModule,
    ClientsModule,
    PasswordsModule,
    MfaModule,
    RbacModule,
    TokensModule,
    ManagementModule,
    AuditModule,
  ],
})
export class AuthModule {}


