/**
* File: src/modules/auth/oidc/userinfo.controller.ts
* Module: modules/auth/oidc
* Purpose: OIDC UserInfo endpoint - minimal JWT verification
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Expects Bearer access token; returns subject and basic claims
*/

import { Controller, Get, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { JwkService } from '../../../shared/crypto/jwk.service';

@Controller('/userinfo')
export class UserInfoController {
  constructor(private readonly jwk: JwkService) {}

  @Get()
  async userinfo(@Headers('authorization') authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new HttpException({ code: 'UNAUTHORIZED', message: 'Missing bearer token' }, HttpStatus.UNAUTHORIZED);
    }
    const token = authorization.slice('Bearer '.length);
    try {
      const { payload } = await this.jwk.verifyJwt(token);
      // Minimal response; expand with scope-based claims in future
      return {
        sub: payload.sub,
        email: (payload as any).email,
        email_verified: (payload as any).email_verified,
        name: (payload as any).name,
      };
    } catch (e) {
      throw new HttpException({ code: 'INVALID_TOKEN', message: 'Invalid access token' }, HttpStatus.UNAUTHORIZED);
    }
  }
}


