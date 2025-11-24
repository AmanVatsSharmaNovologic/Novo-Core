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
import { JwksController } from './controllers/jwks.controller';
import { DiscoveryController } from './controllers/discovery.controller';
import { AuthorizeController } from './controllers/authorize.controller';
import { TokenController } from './controllers/token.controller';
import { UserInfoController } from './controllers/userinfo.controller';
import { IntrospectController } from './controllers/introspect.controller';
import { RevokeController } from './controllers/revoke.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { TokensModule } from '../tokens/tokens.module';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { PasswordsModule } from '../passwords/passwords.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationCode } from '../entities/authorization-code.entity';
import { OpSessionService } from '../sessions/services/op-session.service';
import { LoginController } from './controllers/login.controller';
import { ConsentController } from './controllers/consent.controller';
import { AuthorizationCodeService } from './services/authorization-code.service';
import { RbacModule } from '../rbac/rbac.module';
import { LoginAttemptsService } from './services/login-attempts.service';
import { LoginAttempt } from '../entities/login-attempt.entity';
import { Tenant } from '../entities/tenant.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TenantStatusGuard } from '../../../shared/tenancy/tenant-status.guard';
import { APP_GUARD } from '@nestjs/core';
import { Identity } from '../entities/identity.entity';
import { User } from '../entities/user.entity';
import { Membership } from '../entities/membership.entity';
import { PublicRegistrationService } from './services/public-registration.service';
import { RegistrationController } from './controllers/registration.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthorizationCode, LoginAttempt, Tenant, RefreshToken, Identity, User, Membership]),
    SessionsModule,
    TokensModule,
    AuditModule,
    ClientsModule,
    PasswordsModule,
    RbacModule,
  ],
  controllers: [
    JwksController,
    DiscoveryController,
    AuthorizeController,
    TokenController,
    UserInfoController,
    IntrospectController,
    RevokeController,
    LoginController,
    RegistrationController,
    ConsentController,
  ],
  providers: [
    OpSessionService,
    AuthorizationCodeService,
    LoginAttemptsService,
    PublicRegistrationService,
    {
      provide: APP_GUARD,
      useClass: TenantStatusGuard,
    },
  ],
})
export class OidcModule {}


