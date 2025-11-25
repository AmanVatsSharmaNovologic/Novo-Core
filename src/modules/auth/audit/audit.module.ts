/**
* File: src/modules/auth/audit/audit.module.ts
* Module: modules/auth/audit
* Purpose: Module providing AuditService
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Exported for use in auth and management flows
*/

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}


