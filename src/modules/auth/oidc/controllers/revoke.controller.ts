/**
* File: src/modules/auth/oidc/controllers/revoke.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Token Revocation - revoke refresh token chains; audit access token revocation
* Author: Cursor / BharatERP
* Last-updated: 2025-11-15
*/

import { Body, Controller, HttpCode, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { RequestContext } from '../../../../shared/request-context';
import { AuditService } from '../../audit/audit.service';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { createHash } from 'crypto';

class RevokeDto {
  @IsString()
  token!: string;

  @IsOptional()
  @IsIn(['access_token', 'refresh_token'])
  token_type_hint?: 'access_token' | 'refresh_token';
}

@Controller('/revoke')
export class RevokeController {
  constructor(
    private readonly audit: AuditService,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async revoke(@Body() body: RevokeDto) {
    const tenantIdFromCtx = RequestContext.get()?.tenantId;
    const hint = body.token_type_hint;

    // If hinted access token: stateless JWT; acknowledge and audit
    if (hint === 'access_token') {
      if (tenantIdFromCtx) {
        await this.audit.logEvent({
          tenantId: tenantIdFromCtx,
          type: 'token.revoke',
          metadata: { hinted: 'access_token' },
        });
      }
      return {};
    }

    // Attempt refresh token revocation (idempotent)
    const tokenHash = createHash('sha256').update(body.token).digest('hex');
    const existing = tenantIdFromCtx
      ? await this.refreshRepo.findOne({ where: { tenantId: tenantIdFromCtx, tokenHash } })
      : await this.refreshRepo.findOne({ where: { tokenHash } });

    if (existing?.sessionId) {
      await this.refreshRepo
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('session_id = :sid', { sid: existing.sessionId })
        .execute();
      await this.audit.logEvent({
        tenantId: existing.tenantId,
        type: 'token.revoke',
        resource: existing.sessionId,
        metadata: { hinted: hint ?? null },
      });
      return {};
    }

    // Not found — still 200 per RFC 7009 (idempotent)
    if (tenantIdFromCtx) {
      await this.audit.logEvent({
        tenantId: tenantIdFromCtx,
        type: 'token.revoke',
        metadata: { result: 'not_found', hinted: hint ?? null },
      });
    }
    return {};
  }
}


