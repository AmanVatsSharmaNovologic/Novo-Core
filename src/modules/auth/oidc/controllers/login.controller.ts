/**
* File: src/modules/auth/oidc/controllers/login.controller.ts
* Module: modules/auth/oidc
* Purpose: Login UI for OP session
* Author: Cursor / BharatERP
* Last-updated: 2025-11-25
* Notes:
* - Resolves tenant for login via RequestContext or ClientService.resolveClient
*   so global realm clients (e.g. app-spa) do not require x-tenant-id on /login.
*/

import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Response } from 'express';
import { PasswordService } from '../../passwords/services/password.service';
import { RequestContext } from '../../../../shared/request-context';
import { OpSessionService } from '../../sessions/services/op-session.service';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../../shared/config/config.types';
import { Inject } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { LoginAttemptsService } from '../services/login-attempts.service';
import { LoggerService } from '../../../../shared/logger';
import { CsrfGuard } from '../../../common/guards/csrf.guard';
import { randomUUID } from 'crypto';
import { ClientService } from '../../clients/services/client.service';

@Controller('/login')
export class LoginController {
  constructor(
    dataSource: DataSource,
    private readonly passwords: PasswordService,
    private readonly op: OpSessionService,
    private readonly audit: AuditService,
    private readonly attempts: LoginAttemptsService,
    private readonly logger: LoggerService,
    private readonly clients: ClientService,
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
  ) {
    this.users = dataSource.getRepository(User);
  }
  private readonly users: Repository<User>;

  @Get()
  getLogin(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Res() res: Response,
  ) {
    const csrfToken = randomUUID();
    res.cookie('csrf', csrfToken, {
      httpOnly: false,
      secure: this.config.cookie.secure,
      sameSite: this.config.cookie.sameSite === 'none' ? 'none' : this.config.cookie.sameSite,
      domain: this.config.cookie.domain,
      path: '/',
      maxAge: 1000 * 60 * 15,
    });
    return res.render('login', {
      clientId,
      redirectUri,
      responseType,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
      csrfToken,
    });
  }

  @Post()
  @UseGuards(CsrfGuard)
  async postLogin(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('client_id') clientId: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('response_type') responseType: string,
    @Body('scope') scope: string,
    @Body('state') state: string,
    @Body('code_challenge') codeChallenge: string,
    @Body('code_challenge_method') codeChallengeMethod: string,
    @Res() res: Response,
  ) {
    // Resolve effective tenant for login:
    // - Prefer RequestContext.tenantId (x-tenant-id / query / subdomain).
    // - Fallback to ClientService.resolveClient to support global realm clients
    //   like app-spa that do not send x-tenant-id on /authorize or /login.
    const ctxTenantId = RequestContext.get()?.tenantId;
    const { tenantId } = await this.clients.resolveClient(ctxTenantId, clientId);
    if (!tenantId) {
      this.logger.warn({ clientId, redirectUri }, 'Login attempt without resolvable tenant');
      throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
    }
    if (tenantId !== ctxTenantId) {
      RequestContext.set({ tenantId });
    }
    const ip = (res.req as any).ip as string | undefined || (res.req.socket?.remoteAddress as string | undefined) || '';
    const ua = (res.req.headers['user-agent'] as string | undefined) || '';
    const csrfToken = randomUUID();
    res.cookie('csrf', csrfToken, {
      httpOnly: false,
      secure: this.config.cookie.secure,
      sameSite: this.config.cookie.sameSite === 'none' ? 'none' : this.config.cookie.sameSite,
      domain: this.config.cookie.domain,
      path: '/',
      maxAge: 1000 * 60 * 15,
    });
    const renderWithError = (status: number, message: string) => {
      this.logger.debug(
        { tenantId, email, clientId, ip, status },
        'Rendering login page with error',
      );
      return res.status(status).render('login', {
        error: message,
        email,
        clientId,
        redirectUri,
        responseType,
        scope,
        state,
        codeChallenge,
        codeChallengeMethod,
        csrfToken,
      });
    };

    if (await this.attempts.isLocked(tenantId, email, ip || '')) {
      await this.audit.logEvent({
        tenantId,
        type: 'login.locked',
        metadata: { email, ip, clientId, ua },
      });
      return renderWithError(429, 'Too many attempts. Try again later.');
    }
    const user = await this.users.findOne({ where: { tenantId, email } });
    if (!user) {
      await this.attempts.incrementFailure(tenantId, email, ip || '');
      await this.audit.logEvent({
        tenantId,
        type: 'login.failure',
        metadata: { reason: 'user_not_found', email, ip, clientId, ua },
      });
      return renderWithError(401, 'Invalid credentials');
    }
    const ok = await this.passwords.verifyPassword(user.passwordHash, password);
    if (!ok) {
      await this.attempts.incrementFailure(tenantId, email, ip || '');
      await this.audit.logEvent({
        tenantId,
        actorId: user.id,
        type: 'login.failure',
        metadata: { reason: 'bad_password', email, ip, clientId, ua },
      });
      return renderWithError(401, 'Invalid credentials');
    }
    await this.attempts.resetOnSuccess(tenantId, email, ip || '');
    const token = await this.op.issue(tenantId, user.id);
    this.logger.info(
      { tenantId, userId: user.id, clientId, ip },
      'Login successful; issuing OP session',
    );
    await this.audit.logEvent({
      tenantId,
      actorId: user.id,
      type: 'login.success',
      resource: 'op_session',
      metadata: { clientId, redirectUri },
    });
    res.cookie('op_session', token, {
      httpOnly: true,
      secure: this.config.cookie.secure,
      sameSite: this.config.cookie.sameSite === 'none' ? 'none' : this.config.cookie.sameSite,
      domain: this.config.cookie.domain,
      path: '/',
      maxAge: 1000 * 60 * 60 * 12,
    });
    return res.redirect(
      `/consent?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(
        state,
      )}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=${encodeURIComponent(
          codeChallengeMethod,
      )}`,
    );
  }
}


