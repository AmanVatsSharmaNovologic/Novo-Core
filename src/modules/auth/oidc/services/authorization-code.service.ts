/**
* File: src/modules/auth/oidc/services/authorization-code.service.ts
* Module: modules/auth/oidc
* Purpose: Issue and validate authorization codes (PKCE)
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Stores codeHash only; verifies code_verifier with code_challenge
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationCode } from '../../entities/authorization-code.entity';
import { createHash, randomUUID } from 'crypto';

export interface IssueCodeInput {
  tenantId: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
}

@Injectable()
export class AuthorizationCodeService {
  constructor(@InjectRepository(AuthorizationCode) private readonly repo: Repository<AuthorizationCode>) {}

  async issue(input: IssueCodeInput): Promise<string> {
    const rawCode = randomUUID() + '.' + randomUUID();
    const codeHash = this.hash(rawCode);
    const row = this.repo.create({
      tenantId: input.tenantId,
      userId: input.userId,
      clientId: input.clientId,
      codeHash,
      redirectUri: input.redirectUri,
      scope: input.scope,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5),
    });
    await this.repo.save(row);
    return rawCode;
  }

  async consume(tenantId: string, clientId: string, rawCode: string, redirectUri: string, codeVerifier: string) {
    const codeHash = this.hash(rawCode);
    const row = await this.repo.findOne({ where: { tenantId, clientId, codeHash } });
    if (!row) throw new Error('invalid_grant');
    if (row.consumedAt) throw new Error('invalid_grant');
    if (row.expiresAt.getTime() < Date.now()) throw new Error('invalid_grant');
    if (row.redirectUri !== redirectUri) throw new Error('invalid_grant');

    if (row.codeChallengeMethod === 'S256') {
      const calc = this.base64Url(createHash('sha256').update(codeVerifier).digest());
      if (calc !== row.codeChallenge) throw new Error('invalid_grant');
    } else {
      if (codeVerifier !== row.codeChallenge) throw new Error('invalid_grant');
    }
    row.consumedAt = new Date();
    await this.repo.save(row);
    return { userId: row.userId, scope: row.scope };
  }

  private hash(s: string): string {
    return createHash('sha256').update(s).digest('hex');
  }

  private base64Url(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}


