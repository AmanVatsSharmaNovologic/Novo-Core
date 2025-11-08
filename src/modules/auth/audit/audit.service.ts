/**
* File: src/modules/auth/audit/audit.service.ts
* Module: modules/auth/audit
* Purpose: Persist structured audit events
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Use for login, token actions, admin changes
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity';

export interface AuditPayload {
  tenantId: string;
  actorId?: string;
  type: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditEvent) private readonly repo: Repository<AuditEvent>) {}

  async logEvent(payload: AuditPayload): Promise<void> {
    const row = this.repo.create({
      tenantId: payload.tenantId,
      actorId: payload.actorId,
      type: payload.type,
      resource: payload.resource,
      metadata: payload.metadata,
    });
    await this.repo.save(row);
  }
}


