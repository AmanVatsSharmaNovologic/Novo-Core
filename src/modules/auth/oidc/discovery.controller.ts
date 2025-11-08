/**
* File: src/modules/auth/oidc/discovery.controller.ts
* Module: modules/auth/oidc
* Purpose: OIDC Discovery document endpoint
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Path: /.well-known/openid-configuration
*/

import { Controller, Get } from '@nestjs/common';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../shared/config/config.types';
import { Inject } from '@nestjs/common';

@Controller('/.well-known')
export class DiscoveryController {
  constructor(@Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig) {}

  @Get('/openid-configuration')
  openidConfiguration() {
    const issuer = this.config.domain.issuerUrl;
    return {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks.json`,
      revocation_endpoint: `${issuer}/revoke`,
      introspection_endpoint: `${issuer}/introspect`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
      code_challenge_methods_supported: ['S256', 'plain'],
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      claims_supported: ['sub', 'email', 'email_verified', 'name', 'given_name', 'family_name'],
      grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    };
  }
}


