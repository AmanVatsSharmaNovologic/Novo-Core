/**
* File: src/modules/auth/oidc/services/login-attempts.service.ts
* Module: modules/auth/oidc
* Description: DB-backed failed login tracking with progressive lockouts.
* Author: BharatERP
* @created 2025-11-15
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAttempt } from '../../entities/login-attempt.entity';

@Injectable()
export class LoginAttemptsService {
  constructor(@InjectRepository(LoginAttempt) private readonly repo: Repository<LoginAttempt>) {}

  async isLocked(tenantId: string, email: string, ip: string): Promise<boolean> {
    const attempt = await this.repo.findOne({ where: { tenantId, email: email.toLowerCase(), ip } });
    if (!attempt?.lockedUntil) return false;
    return attempt.lockedUntil.getTime() > Date.now();
    }

  async incrementFailure(tenantId: string, email: string, ip: string): Promise<{ lockedUntil?: Date; count: number }> {
    const key = { tenantId, email: email.toLowerCase(), ip };
    let attempt = await this.repo.findOne({ where: key });
    if (!attempt) {
      attempt = this.repo.create({ ...key, count: 0 });
    }
    attempt.count += 1;
    attempt.lastAttemptAt = new Date();
    // Progressive lockout: 5 fails => 5m, 10 => 15m, 15+ => 60m
    if (attempt.count >= 15) {
      attempt.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
    } else if (attempt.count >= 10) {
      attempt.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    } else if (attempt.count >= 5) {
      attempt.lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    }
    await this.repo.save(attempt);
    return { lockedUntil: attempt.lockedUntil, count: attempt.count };
  }

  async resetOnSuccess(tenantId: string, email: string, ip: string): Promise<void> {
    const attempt = await this.repo.findOne({ where: { tenantId, email: email.toLowerCase(), ip } });
    if (!attempt) return;
    attempt.count = 0;
    attempt.lockedUntil = undefined;
    attempt.lastAttemptAt = new Date();
    await this.repo.save(attempt);
  }
}


