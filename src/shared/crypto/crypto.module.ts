/**
* File: src/shared/crypto/crypto.module.ts
* Module: shared/crypto
* Purpose: Crypto module exposing JwkService and rotation scheduler
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Schedules periodic ensureActiveKey/rotation checks
*/

import { Global, Module } from '@nestjs/common';
import { JwkService } from './jwk.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Key } from '../../modules/auth/entities/key.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { JwkRotationService } from './jwk.rotation';

@Global()
@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Key])],
  providers: [JwkService, JwkRotationService],
  exports: [JwkService],
})
export class CryptoModule {}


