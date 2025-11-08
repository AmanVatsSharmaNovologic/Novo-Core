/**
* File: src/modules/auth/oidc/controllers/login.controller.ts
* Module: modules/auth/oidc
* Purpose: Login UI for OP session
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Response } from 'express';
import { PasswordService } from '../../passwords/services/password.service';
import { RequestContext } from '../../../../shared/request-context';
import { OpSessionService } from '../../sessions/services/op-session.service';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../../shared/config/config.types';
import { Inject } from '@nestjs/common';

@Controller('/login')
export class LoginController {
  constructor(
    dataSource: DataSource,
    private readonly passwords: PasswordService,
    private readonly op: OpSessionService,
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
    return res.render('login', {
      clientId,
      redirectUri,
      responseType,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
    });
  }

  @Post()
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
    const tenantId = RequestContext.get()?.tenantId;
    if (!tenantId) throw new HttpException({ code: 'invalid_request', message: 'Missing tenant' }, HttpStatus.BAD_REQUEST);
    const user = await this.users.findOne({ where: { tenantId, email } });
    if (!user) {
      return res.status(401).render('login', { error: 'Invalid credentials' });
    }
    const ok = await this.passwords.verifyPassword(user.passwordHash, password);
    if (!ok) {
      return res.status(401).render('login', { error: 'Invalid credentials' });
    }
    const token = await this.op.issue(tenantId, user.id);
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


