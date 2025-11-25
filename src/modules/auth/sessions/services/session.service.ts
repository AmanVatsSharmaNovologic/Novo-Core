/**
* File: src/modules/auth/sessions/services/session.service.ts
* Module: modules/auth/sessions
* Purpose: Manage sessions and refresh token rotation with reuse detection
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Stores only hashes of refresh tokens
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../entities/session.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { randomUUID, createHash } from 'crypto';
import { LoggerService } from '../../../../shared/logger';
import { AppError } from '../../../../common/errors';

export interface IssueSessionInput {
  tenantId: string;
  userId: string;
  device?: string;
  ip?: string;
}

export interface RefreshRotationResult {
  refreshToken: string;
  previousRevoked: boolean;
  userId: string;
  sessionId: string;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
    private readonly logger: LoggerService,
  ) {}

  async issueSession(input: IssueSessionInput): Promise<{ session: Session; refreshToken: string }> {
    const session = this.sessionRepo.create({
      tenantId: input.tenantId,
      userId: input.userId,
      device: input.device,
      ip: input.ip,
      lastSeenAt: new Date(),
    });
    await this.sessionRepo.save(session);
    const refreshToken = this.generateRawToken();
    const tokenHash = this.hashToken(refreshToken);
    const rt = this.refreshRepo.create({
      tenantId: input.tenantId,
      sessionId: session.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    await this.refreshRepo.save(rt);
    return { session, refreshToken };
  }

  async rotateRefreshToken(tenantId: string, oldToken: string): Promise<RefreshRotationResult> {
    const oldHash = this.hashToken(oldToken);
    const existing = await this.refreshRepo.findOne({ where: { tenantId, tokenHash: oldHash } });
    if (!existing || existing.revokedAt) {
      this.logger.warn({ tenantId }, 'Refresh reuse or unknown token');
      if (existing?.sessionId) {
        await this.refreshRepo
          .createQueryBuilder()
          .update(RefreshToken)
          .set({ revokedAt: new Date() })
          .where('session_id = :sid', { sid: existing.sessionId })
          .execute();
      }
      // Use standardized AppError code for exception filter mapping
      throw new AppError('INVALID_GRANT', 'Invalid refresh token');
    }
    const session = await this.sessionRepo.findOne({ where: { id: existing.sessionId } });
    if (!session) {
      throw new AppError('INVALID_GRANT', 'Invalid session for refresh token');
    }
    const newToken = this.generateRawToken();
    const newHash = this.hashToken(newToken);
    const next = this.refreshRepo.create({
      tenantId,
      sessionId: existing.sessionId,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      rotatedFromId: existing.id,
    });
    existing.revokedAt = new Date();
    await this.refreshRepo.save([existing, next]);
    return { refreshToken: newToken, previousRevoked: true, userId: session.userId, sessionId: session.id };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.refreshRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('session_id = :sid', { sid: sessionId })
      .execute();
  }

  private generateRawToken(): string {
    return randomUUID() + '.' + randomUUID();
  }
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}


