/**
 * @file interactions.controller.ts
 * @module modules/auth/oidc-provider
 * @description Interaction endpoints (login/consent) for `oidc-provider` when enabled.
 *              If the provider is disabled, these routes return 404 to avoid conflicts.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { OidcProviderService } from './oidc-provider.service';

@Controller('/interaction')
export class InteractionsController {
  constructor(private readonly op: OidcProviderService) {}

  @Get('/:uid')
  async getInteraction(@Param('uid') uid: string, @Res() res: Response) {
    if (!this.op.isEnabled()) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }
    // Defer to the provider’s built-in interactions if mounted via middleware elsewhere.
    // This controller acts as a placeholder for custom UI flows if needed in future.
    return res.status(501).json({ error: 'INTERACTION_NOT_IMPLEMENTED', uid });
  }

  @Post('/:uid/login')
  async postLogin(
    @Param('uid') uid: string,
    @Body('email') _email: string,
    @Body('password') _password: string,
    @Res() res: Response,
  ) {
    if (!this.op.isEnabled()) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }
    return res.status(501).json({ error: 'LOGIN_NOT_IMPLEMENTED', uid });
  }

  @Post('/:uid/confirm')
  async postConsent(@Param('uid') uid: string, @Res() res: Response) {
    if (!this.op.isEnabled()) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }
    return res.status(501).json({ error: 'CONSENT_NOT_IMPLEMENTED', uid });
  }
}


