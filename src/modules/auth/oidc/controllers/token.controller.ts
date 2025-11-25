/**
* File: src/modules/auth/oidc/controllers/token.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Token endpoint (code exchange + refresh + client_credentials)
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-24
* Notes:
* - For authorization_code grant, supports global realm clients (e.g., app-spa) without requiring tenantId from the frontend.
*/

import { Body, Controller, HttpException, HttpStatus, Post, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request, Response } from 'express';
import { SessionService } from '../../sessions/services/session.service';
import { TokenService } from '../../tokens/token.service';
import { RequestContext } from '../../../../shared/request-context';
import { AuditService } from '../../audit/audit.service';
import { AuthorizationCodeService } from '../services/authorization-code.service';
import { ClientService } from '../../clients/services/client.service';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../../shared/config/config.types';
import { Inject } from '@nestjs/common';
import { RbacService } from '../../rbac/rbac.service';
import { PasswordService } from '../../passwords/services/password.service';
import { PermissionsService } from '../../rbac/permissions.service';
import { IsIn, IsOptional, IsString } from 'class-validator';

class TokenRequestDto {
  @IsIn(['authorization_code', 'refresh_token', 'client_credentials'])
  grant_type!: 'authorization_code' | 'refresh_token' | 'client_credentials';

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @IsOptional()
  @IsString()
  code_verifier?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  client_secret?: string;
}

@Controller('/token')
export class TokenController {
  constructor(
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly codes: AuthorizationCodeService,
    private readonly clients: ClientService,
    private readonly rbac: RbacService,
    private readonly passwords: PasswordService,
    private readonly permissions: PermissionsService,
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
  ) {}

  /**
   * Set HttpOnly cookies for first-party browser flows.
   * - `rt`: long-lived refresh token (30d)
   * - `at`: short-lived access token (aligned with access token TTL, 5m)
   */
  private setSessionCookies(res: Response, accessToken: string, refreshToken: string, includeAccessToken: boolean) {
    const sameSite = this.config.cookie.sameSite === 'none' ? 'none' : this.config.cookie.sameSite;
    const common = {
      httpOnly: true,
      secure: this.config.cookie.secure,
      sameSite,
      domain: this.config.cookie.domain,
      path: '/',
    } as const;

    // Refresh token cookie (30 days)
    res.cookie('rt', refreshToken, {
      ...common,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    if (includeAccessToken) {
      // Access token cookie (5 minutes) – allows browser-only flows with credentials: 'include'
      res.cookie('at', accessToken, {
        ...common,
        maxAge: 1000 * 60 * 5,
      });
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async token(@Body() body: TokenRequestDto, @Res({ passthrough: true }) res: Response, _req: Request) {
    const grant = body.grant_type;
    if (grant === 'client_credentials') {
      const tenantId = RequestContext.get()?.tenantId;
      if (!tenantId) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
      }

      // Resolve client_id and client_secret from body or Authorization: Basic
      let providedClientId: string | undefined = body.client_id;
      let providedSecret: string | undefined = body.client_secret;
      const authHeader = (_req.headers['authorization'] as string | undefined) || '';
      if (authHeader.startsWith('Basic ')) {
        try {
          const decoded = Buffer.from(authHeader.slice('Basic '.length), 'base64').toString('utf8');
          const sep = decoded.indexOf(':');
          const cid = sep >= 0 ? decoded.slice(0, sep) : decoded;
          const secret = sep >= 0 ? decoded.slice(sep + 1) : '';
          if (cid) {
            providedClientId = providedClientId ?? cid;
            providedSecret = providedSecret ?? secret;
          }
        } catch {
          // ignore parse errors
        }
      }
      if (!providedClientId) {
        throw new HttpException({ code: 'invalid_client', message: 'Missing client_id' }, HttpStatus.BAD_REQUEST);
      }
      const client = await this.clients.findByClientId(tenantId, providedClientId);
      if (!client) {
        throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
      }
      if (!client.grantTypes?.includes('client_credentials')) {
        throw new HttpException({ code: 'unauthorized_client' }, HttpStatus.BAD_REQUEST);
      }
      if (!client.clientSecretHash) {
        // Require confidential client for client_credentials
        throw new HttpException({ code: 'unauthorized_client', message: 'Confidential client required' }, HttpStatus.BAD_REQUEST);
      }
      if (!providedSecret) {
        throw new HttpException({ code: 'invalid_client', message: 'Missing client_secret' }, HttpStatus.BAD_REQUEST);
      }
      const secretOk = await this.passwords.verifyPassword(client.clientSecretHash, providedSecret);
      if (!secretOk) {
        throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
      }

      // Determine scopes: restrict to client's allowed scopes
      const requestedScopes = (body.scope || '').split(/\s+/).filter(Boolean);
      const allowedScopes = Array.isArray(client.scopes) ? client.scopes : [];
      const effectiveScopes =
        requestedScopes.length > 0
          ? requestedScopes.filter((s) => allowedScopes.includes(s))
          : allowedScopes;
      const scopeStr = effectiveScopes.join(' ');

      const accessToken = await this.tokens.issueAccessToken(`client:${client.clientId}`, 'novologic-api', {
        scope: scopeStr,
        org_id: tenantId,
        azp: client.clientId,
        grant: 'client_credentials',
      });
      await this.audit.logEvent({
        tenantId,
        type: 'client.token',
        resource: client.id,
        metadata: { clientId: client.clientId, grant: 'client_credentials', scope: scopeStr },
      });
      return {
        token_type: 'Bearer',
        access_token: accessToken,
        expires_in: 300,
        scope: scopeStr || undefined,
      };
    }
    if (grant === 'refresh_token') {
      const tenantId = RequestContext.get()?.tenantId;
      if (!tenantId) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
      }
      // Accept refresh token from body or HttpOnly cookie 'rt' for first-party clients
      const cookieRt: string | undefined = ((_req as any)?.cookies?.rt as string | undefined) ?? undefined;
      const providedRt: string | undefined = body.refresh_token ?? cookieRt;
      if (!providedRt) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing refresh_token' }, HttpStatus.BAD_REQUEST);
      }
      const rotated = await this.sessions.rotateRefreshToken(tenantId, providedRt);
      const roles = await this.rbac.getUserRoleNames(tenantId, rotated.userId);
      const permissions = await this.permissions.getPermissionsForUser(tenantId, rotated.userId);
      const accessToken = await this.tokens.issueAccessToken(rotated.userId, 'novologic-api', {
        scope: body.scope ?? 'openid profile email',
        org_id: tenantId,
        sid: rotated.sessionId,
        roles,
        permissions,
      });
      await this.audit.logEvent({
        tenantId,
        actorId: rotated.userId,
        type: 'token.refresh',
        resource: rotated.sessionId,
      });
      // On refresh, always set cookies so first-party SPAs can rely on HttpOnly cookies.
      this.setSessionCookies(res, accessToken, rotated.refreshToken, true);
      return {
        token_type: 'Bearer',
        access_token: accessToken,
        expires_in: 300,
        refresh_token: rotated.refreshToken,
      };
    }

    if (grant === 'authorization_code') {
      if (!body.client_id || !body.code || !body.redirect_uri || !body.code_verifier) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing parameters' }, HttpStatus.BAD_REQUEST);
      }
      const ctxTenantId = RequestContext.get()?.tenantId;
      const { client, tenantId } = await this.clients.resolveClient(ctxTenantId, body.client_id);
      if (!tenantId) {
        throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
      }
      if (!client) throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
      if (!client.grantTypes?.includes('authorization_code')) {
        throw new HttpException({ code: 'unauthorized_client' }, HttpStatus.BAD_REQUEST);
      }
      if (tenantId !== ctxTenantId) {
        RequestContext.set({ tenantId });
      }
      // Authenticate confidential clients
      if (client.clientSecretHash) {
        let providedSecret: string | undefined = body.client_secret;
        const auth = (_req.headers['authorization'] as string | undefined) || '';
        if (auth.startsWith('Basic ')) {
          try {
            const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
            const sep = decoded.indexOf(':');
            const cid = sep >= 0 ? decoded.slice(0, sep) : decoded;
            const secret = sep >= 0 ? decoded.slice(sep + 1) : '';
            if (cid && cid === body.client_id) {
              providedSecret = secret;
            }
          } catch {
            // ignore parse errors
          }
        }
        if (!providedSecret) {
          throw new HttpException({ code: 'invalid_client', message: 'Missing client_secret' }, HttpStatus.BAD_REQUEST);
        }
        const ok = await this.passwords.verifyPassword(client.clientSecretHash, providedSecret);
        if (!ok) throw new HttpException({ code: 'invalid_client' }, HttpStatus.BAD_REQUEST);
      }
      const consumed = await this.codes.consume(tenantId, client.id, body.code, body.redirect_uri, body.code_verifier);
      const { session, refreshToken } = await this.sessions.issueSession({
        tenantId,
        userId: consumed.userId,
      });
      const roles = await this.rbac.getUserRoleNames(tenantId, consumed.userId);
      const permissions = await this.permissions.getPermissionsForUser(tenantId, consumed.userId);
      const accessToken = await this.tokens.issueAccessToken(consumed.userId, 'novologic-api', {
        scope: consumed.scope ?? 'openid profile email',
        org_id: tenantId,
        sid: session.id,
        roles,
        permissions,
      });
      if (client.firstParty) {
        // For first-party clients, set both refresh and access token cookies.
        this.setSessionCookies(res, accessToken, refreshToken, true);
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


