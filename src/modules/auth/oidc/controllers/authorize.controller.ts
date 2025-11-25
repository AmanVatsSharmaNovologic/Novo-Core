/**
* File: src/modules/auth/oidc/controllers/authorize.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Authorization endpoint (code+PKCE)
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-24
* Notes:
* - Redirects to /login if not authenticated; then to /consent
* - Supports global realm clients (e.g. app-spa) without requiring tenantId from the frontend
*/

import { Controller, Get, HttpException, HttpStatus, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ClientService } from '../../clients/services/client.service';
import { RequestContext } from '../../../../shared/request-context';
import { OpSessionService } from '../../sessions/services/op-session.service';

@Controller('/authorize')
export class AuthorizeController {
  constructor(private readonly clients: ClientService, private readonly op: OpSessionService) {}

  @Get()
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: 'S256' | 'plain' = 'S256',
    @Res() res: Response,
  ) {
    if (responseType !== 'code') {
      throw new HttpException({ code: 'unsupported_response_type' }, HttpStatus.BAD_REQUEST);
    }
    if (!codeChallenge) {
      throw new HttpException({ code: 'invalid_request', message: 'Missing code_challenge' }, HttpStatus.BAD_REQUEST);
    }
    const ctxTenantId = RequestContext.get()?.tenantId;
    const { client, tenantId } = await this.clients.resolveClient(ctxTenantId, clientId);
    if (!tenantId) {
      throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
    }
    if (!client) {
      throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
    }
    // Ensure RequestContext reflects the effective tenant (important for logging/audit)
    if (tenantId !== ctxTenantId) {
      RequestContext.set({ tenantId });
    }
    if (!client || !this.clients.isRedirectAllowed(client, redirectUri)) {
      throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
    }

    const sessionCookie = (res.req as any).cookies?.op_session as string | undefined;
    if (!sessionCookie) {
      return res.redirect(
        `/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(
          state,
        )}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=${encodeURIComponent(
          codeChallengeMethod,
        )}`,
      );
    }
    try {
      await this.op.verify(sessionCookie);
      return res.redirect(
        `/consent?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(
          state,
        )}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=${encodeURIComponent(
          codeChallengeMethod,
        )}`,
      );
    } catch {
      return res.redirect(
        `/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(
          state,
        )}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=${encodeURIComponent(
          codeChallengeMethod,
        )}`,
      );
    }
  }
}


