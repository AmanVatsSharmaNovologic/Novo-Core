/**
* File: src/shared/crypto/jwk.rotation.ts
* Module: shared/crypto
* Purpose: Scheduled key rotation and warm-up for JWKS
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Rotates key daily; configurable later
*/

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwkService } from './jwk.service';
import { LoggerService } from '../logger';

@Injectable()
export class JwkRotationService {
  constructor(private readonly jwk: JwkService, private readonly logger: LoggerService) {}

  // Warm-up on startup
  async onModuleInit(): Promise<void> {
    try {
      await this.jwk.ensureActiveKey();
      this.logger.info({ service: 'JwkRotationService' }, 'JWKS ready');
    } catch (e) {
      this.logger.error({ err: e }, 'Failed to initialize JWKS');
    }
  }

  // Rotate daily at 02:00 IST (~20:30 UTC)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async rotateDaily(): Promise<void> {
    try {
      await this.jwk.rotateKeys();
    } catch (e) {
      this.logger.error({ err: e }, 'Key rotation failed');
    }
  }
}


