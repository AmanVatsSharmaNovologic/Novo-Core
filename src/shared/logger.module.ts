/**
* File: src/shared/logger.module.ts
* Module: shared/logger
* Purpose: Provide LoggerService via DI and export it for app-wide usage
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Depends on AppConfigModule for configuration
*/

import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger';
import { AppConfigModule } from './config/config.module';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}


