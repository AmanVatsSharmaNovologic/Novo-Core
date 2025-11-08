/**
* File: src/modules/auth/oidc/token.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Token endpoint - placeholder for code exchange/refresh
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - To be implemented with code verification and refresh rotation
*/

import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from '../sessions/session.service';
import { TokenService } from '../tokens/token.service';
import { RequestContext } from '../../../shared/request-context';
import { AuditService } from '../audit/audit.service';

class TokenRequestDto {
  grant_type!: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
}

@Controller('/token')
export class TokenController {
  constructor(
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async token(@Body() body: TokenRequestDto, _req: Request) {
    const grant = body.grant_type;
    if (grant === 'refresh_token') {
      const tenantId = RequestContext.get()?.tenantId;
      if (!tenantId) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
      }
      if (!body.refresh_token) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing refresh_token' }, HttpStatus.BAD_REQUEST);
      }
      const rotated = await this.sessions.rotateRefreshToken(tenantId, body.refresh_token);
      const accessToken = await this.tokens.issueAccessToken(rotated.userId, 'novologic-api', {
        scope: body.scope ?? 'openid profile email',
      });
      await this.audit.logEvent({
        tenantId,
        actorId: rotated.userId,
        type: 'token.refresh',
        resource: rotated.sessionId,
      });
      // Minimal ID token placeholder (optional)
      return {
        token_type: 'Bearer',
        access_token: accessToken,
        expires_in: 300,
        refresh_token: rotated.refreshToken,
      };
    }

    throw new HttpException(
      { code: 'unsupported_grant_type', message: 'Only refresh_token grant is implemented' },
      HttpStatus.BAD_REQUEST,
    );
  }
}


