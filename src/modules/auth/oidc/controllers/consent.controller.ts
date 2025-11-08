/**
* File: src/modules/auth/oidc/controllers/consent.controller.ts
* Module: modules/auth/oidc
* Purpose: Consent UI for code flow
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { RequestContext } from '../../../../shared/request-context';
import { ClientService } from '../../clients/services/client.service';
import { AuthorizationCodeService } from '../services/authorization-code.service';
import { OpSessionService } from '../../sessions/services/op-session.service';
import { AuditService } from '../../audit/audit.service';

@Controller('/consent')
export class ConsentController {
  constructor(
    private readonly op: OpSessionService,
    private readonly clients: ClientService,
    private readonly codes: AuthorizationCodeService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async getConsent(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: 'S256' | 'plain' = 'S256',
    @Res() res: Response,
  ) {
    const tenantId = RequestContext.get()?.tenantId;
    if (!tenantId) throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
    const client = await this.clients.findByClientId(tenantId, clientId);
    if (!client || !this.clients.isRedirectAllowed(client, redirectUri)) {
      throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
    }
    if (!client.grantTypes?.includes('authorization_code')) {
      throw new HttpException({ code: 'unauthorized_client', message: 'Grant not allowed' }, HttpStatus.BAD_REQUEST);
    }
    const sessionCookie = (res.req as any).cookies?.op_session as string | undefined;
    if (!sessionCookie) return res.redirect(`/login?${res.req.url.split('?')[1]}`);
    try {
      const sess = await this.op.verify(sessionCookie);
      return res.render('consent', {
        clientId,
        redirectUri,
        responseType,
        scope,
        state,
        codeChallenge,
        codeChallengeMethod,
        clientName: client.clientId,
        userId: sess.userId,
      });
    } catch {
      return res.redirect(`/login?${res.req.url.split('?')[1]}`);
    }
  }

  @Post()
  async postConsent(
    @Body('decision') decision: 'approve' | 'deny',
    @Body('client_id') clientId: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('scope') scope: string,
    @Body('state') state: string,
    @Body('code_challenge') codeChallenge: string,
    @Body('code_challenge_method') codeChallengeMethod: 'S256' | 'plain' = 'S256',
    @Res() res: Response,
  ) {
    const tenantId = RequestContext.get()?.tenantId;
    if (!tenantId) throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
    const client = await this.clients.findByClientId(tenantId, clientId);
    if (!client || !this.clients.isRedirectAllowed(client, redirectUri)) {
      throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
    }
    if (!client.grantTypes?.includes('authorization_code')) {
      throw new HttpException({ code: 'unauthorized_client', message: 'Grant not allowed' }, HttpStatus.BAD_REQUEST);
    }
    if (decision !== 'approve') {
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('state', state ?? '');
      await this.audit.logEvent({
        tenantId,
        actorId: undefined,
        type: 'consent.denied',
        resource: client.id,
        metadata: { clientId: client.clientId, scope },
      });
      return res.redirect(url.toString());
    }
    const sessionCookie = (res.req as any).cookies?.op_session as string | undefined;
    if (!sessionCookie) return res.redirect(`/login?${res.req.url.split('?')[1]}`);
    const sess = await this.op.verify(sessionCookie);
    // Restrict requested scopes to client-allowed scopes
    const requested = (scope || '').split(/\s+/).filter(Boolean);
    const allowed = client.scopes || [];
    const approvedScopes = requested.filter((s) => allowed.includes(s)).join(' ');
    const code = await this.codes.issue({
      tenantId,
      userId: sess.userId,
      clientId: client.id,
      redirectUri,
      scope: approvedScopes,
      codeChallenge,
      codeChallengeMethod,
    });
    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    if (state) url.searchParams.set('state', state);
    await this.audit.logEvent({
      tenantId,
      actorId: sess.userId,
      type: 'consent.approved',
      resource: client.id,
      metadata: { clientId: client.clientId, scope: approvedScopes },
    });
    return res.redirect(url.toString());
  }
}


