/**
* File: src/modules/auth/sessions/services/op-session.service.ts
* Module: modules/auth/sessions
* Purpose: OP login session cookie issuance and verification
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
*/

import { Injectable } from '@nestjs/common';
import { JwkService } from '../../../../shared/crypto/jwk.service';
import { JWTPayload } from 'jose';

export interface OpSessionPayload extends JWTPayload {
  purpose: 'op';
  tenantId: string;
  userId: string;
}

@Injectable()
export class OpSessionService {
  constructor(private readonly jwk: JwkService) {}

  async issue(tenantId: string, userId: string): Promise<string> {
    const payload: OpSessionPayload = { purpose: 'op', tenantId, userId };
    return this.jwk.signJwt(payload, 'novologic-op', userId);
  }

  async verify(token: string): Promise<OpSessionPayload> {
    const { payload } = await this.jwk.verifyJwt<OpSessionPayload>(token);
    if (payload.purpose !== 'op') throw new Error('Invalid op session');
    return payload;
  }
}


