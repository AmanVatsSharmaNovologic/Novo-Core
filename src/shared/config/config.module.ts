/**
* File: src/shared/config/config.module.ts
* Module: shared/config
* Purpose: Provide validated AppConfig via DI and export it globally
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Uses Zod to validate environment variables
* - Exposes CONFIG_DI_TOKEN for injection
*/

import { Global, Module } from '@nestjs/common';
import { buildAppConfig } from './config.factory';
import { CONFIG_DI_TOKEN } from './config.types';

@Global()
@Module({
  providers: [
    {
      provide: CONFIG_DI_TOKEN,
      useFactory: () => buildAppConfig(),
    },
  ],
  exports: [CONFIG_DI_TOKEN],
})
export class AppConfigModule {}


