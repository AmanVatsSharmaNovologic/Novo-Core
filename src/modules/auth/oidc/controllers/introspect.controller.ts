/**
* File: src/modules/auth/oidc/controllers/introspect.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Token Introspection - minimal active flag
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
*/

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { JwkService } from '../../../../shared/crypto/jwk.service';

class IntrospectDto {
  token!: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}

@Controller('/introspect')
export class IntrospectController {
  constructor(private readonly jwk: JwkService) {}

  @Post()
  @HttpCode(200)
  async introspect(@Body() body: IntrospectDto) {
    try {
      const { payload } = await this.jwk.verifyJwt(body.token);
      return {
        active: true,
        sub: payload.sub,
        exp: payload.exp,
        iat: payload.iat,
        iss: payload.iss,
        aud: payload.aud,
        scope: (payload as any).scope,
        org_id: (payload as any).org_id,
        roles: (payload as any).roles,
        permissions: (payload as any).permissions,
      };
    } catch {
      return { active: false };
    }
  }
}


