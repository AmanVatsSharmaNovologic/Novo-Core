/**
* File: src/modules/auth/oidc/controllers/token.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Token endpoint (code exchange + refresh)
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Body, Controller, HttpException, HttpStatus, Post, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SessionService } from '../../sessions/services/session.service';
import { TokenService } from '../../tokens/token.service';
import { RequestContext } from '../../../../shared/request-context';
import { AuditService } from '../../audit/audit.service';
import { AuthorizationCodeService } from '../services/authorization-code.service';
import { ClientService } from '../../clients/services/client.service';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../../shared/config/config.types';
import { Inject } from '@nestjs/common';

class TokenRequestDto {
  grant_type!: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
  client_id?: string;
}

@Controller('/token')
export class TokenController {
  constructor(
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly codes: AuthorizationCodeService,
    private readonly clients: ClientService,
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
  ) {}

  @Post()
  async token(@Body() body: TokenRequestDto, @Res({ passthrough: true }) res: Response, _req: Request) {
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
      res.cookie('rt', rotated.refreshToken, {
        httpOnly: true,
        secure: this.config.cookie.secure,
        sameSite: this.config.cookie.sameSite === 'none' ? 'none' : this.config.cookie.sameSite,
        domain: this.config.cookie.domain,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      return {
        token_type: 'Bearer',
        access_token: accessToken,
        expires_in: 300,
        refresh_token: rotated.refreshToken,
      };
    }

    if (grant === 'authorization_code') {
      const tenantId = RequestContext.get()?.tenantId;
      if (!tenantId) throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
      if (!body.client_id || !body.code || !body.redirect_uri || !body.code_verifier) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing parameters' }, HttpStatus.BAD_REQUEST);
      }
      const client = await this.clients.findByClientId(tenantId, body.client_id);
      if (!client) throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
      const consumed = await this.codes.consume(tenantId, client.id, body.code, body.redirect_uri, body.code_verifier);
      const { session, refreshToken } = await this.sessions.issueSession({
        tenantId,
        userId: consumed.userId,
      });
      const accessToken = await this.tokens.issueAccessToken(consumed.userId, 'novologic-api', {
        scope: consumed.scope ?? 'openid profile email',
      });
      if (client.firstParty) {
        res.cookie('rt', refreshToken, {
          httpOnly: true,
          secure: this.config.cookie.secure,
          sameSite: this.config.cookie.sameSite === 'none' ? 'none' : this.config.cookie.sameSite,
          domain: this.config.cookie.domain,
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 30,
        });
      }
      await this.audit.logEvent({
        tenantId,
        actorId: consumed.userId,
        type: 'token.exchange',
        resource: session.id,
      });
      return {
        token_type: 'Bearer',
        access_token: accessToken,
        expires_in: 300,
        refresh_token: refreshToken,
        scope: consumed.scope,
      };
    }

    throw new HttpException(
      { code: 'unsupported_grant_type', message: 'Only refresh_token grant is implemented' },
      HttpStatus.BAD_REQUEST,
    );
  }
}


