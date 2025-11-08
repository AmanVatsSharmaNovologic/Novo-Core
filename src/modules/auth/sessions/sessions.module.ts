/**
* File: src/modules/auth/sessions/sessions.module.ts
* Module: modules/auth/sessions
* Purpose: Module providing SessionService
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Exports repositories and service for use by OIDC/token flows
*/

import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../entities/session.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, RefreshToken])],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionsModule {}


