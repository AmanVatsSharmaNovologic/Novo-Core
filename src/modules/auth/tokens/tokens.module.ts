/**
* File: src/modules/auth/tokens/tokens.module.ts
* Module: modules/auth/tokens
* Purpose: Module providing TokenService
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Depends on CryptoModule (JwkService)
*/

import { Module } from '@nestjs/common';
import { TokenService } from './token.service';

@Module({
  providers: [TokenService],
  exports: [TokenService],
})
export class TokensModule {}


