/**
* File: src/modules/auth/oidc/authorize.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Authorization endpoint (code+PKCE) - placeholder
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - To be implemented with login+consent flows
*/

import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';

@Controller('/authorize')
export class AuthorizeController {
  @Get()
  authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge?: string,
    @Query('code_challenge_method') codeChallengeMethod?: string,
  ) {
    // Placeholder until full login/consent is implemented
    throw new HttpException(
      {
        code: 'AUTHORIZE_NOT_IMPLEMENTED',
        message: 'Authorization endpoint is not implemented yet',
        details: { clientId, redirectUri, responseType, scope, state, codeChallenge, codeChallengeMethod },
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}


