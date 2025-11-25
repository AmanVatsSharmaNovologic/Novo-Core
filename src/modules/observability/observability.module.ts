/**
* File: src/modules/observability/observability.module.ts
* Module: modules/observability
* Purpose: Observability module exposing health endpoints
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Extend with metrics later
*/

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class ObservabilityModule {}


