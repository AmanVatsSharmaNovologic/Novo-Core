/**
* File: src/modules/auth/oidc/controllers/jwks.controller.ts
* Module: modules/auth/oidc
* Purpose: JWKS endpoint exposing active/retired public keys
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Path: /jwks.json
*/

import { Controller, Get } from '@nestjs/common';
import { JwkService } from '../../../../shared/crypto/jwk.service';

@Controller('/jwks.json')
export class JwksController {
  constructor(private readonly jwk: JwkService) {}

  @Get()
  async getJwks() {
    return this.jwk.getJwks();
  }
}


