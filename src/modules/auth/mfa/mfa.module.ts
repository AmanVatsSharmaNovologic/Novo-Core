/**
* File: src/modules/auth/mfa/mfa.module.ts
* Module: modules/auth/mfa
* Purpose: Module providing TotpService
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Exported for use in auth flows
*/

import { Module } from '@nestjs/common';
import { TotpService } from './services/totp.service';

@Module({
  providers: [TotpService],
  exports: [TotpService],
})
export class MfaModule {}


