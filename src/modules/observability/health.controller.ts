/**
* File: src/modules/observability/health.controller.ts
* Module: modules/observability
* Purpose: Basic health endpoint with DB check
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Path: /health
*/

import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('/health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async health() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      return { status: 'degraded' };
    }
  }
}


