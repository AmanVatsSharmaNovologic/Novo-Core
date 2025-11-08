/**
* File: src/modules/auth/passwords/passwords.module.ts
* Module: modules/auth/passwords
* Purpose: Module providing PasswordService
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Exported for use in auth flows
*/

import { Module } from '@nestjs/common';
import { PasswordService } from './services/password.service';

@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class PasswordsModule {}


