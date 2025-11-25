/**
* File: src/shared/crypto/jwk.service.ts
* Module: shared/crypto
* Purpose: Manage JWK key pairs, rotation, JWKS publishing, and JWT signing
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Uses jose for modern JOSE/JWT operations
*/

import { Injectable } from '@nestjs/common';
import { AppConfig, CONFIG_DI_TOKEN } from '../config/config.types';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Key } from '../../modules/auth/entities/key.entity';
import { generateKeyPair, exportJWK, importJWK, KeyLike, SignJWT, JWTPayload, JWK, jwtVerify, decodeProtectedHeader } from 'jose';
import { randomUUID } from 'crypto';
import { LoggerService } from '../logger';

interface ActiveKey {
  kid: string;
  alg: string;
  privateKey: unknown;
}

@Injectable()
export class JwkService {
  private activeKey?: ActiveKey;
  // Cache for imported public keys by kid to avoid repeated DB and importJWK work
  private readonly publicKeyCache = new Map<string, { key: KeyLike; expiresAt: number }>();
  private readonly publicKeyTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
    @InjectRepository(Key) private readonly keyRepo: Repository<Key>,
    private readonly logger: LoggerService,
  ) {}

  async ensureActiveKey(): Promise<void> {
    if (this.activeKey) return;
    const now = new Date();
    const active = await this.keyRepo.findOne({
      where: { status: 'active' },
      order: { notBefore: 'DESC' },
    });
    if (active) {
      try {
        const privateJwk = (await this.loadPrivateJwk(active.privateRef)) as JWK;
        const privateKey = await importJWK(privateJwk, active.alg);
        this.activeKey = { kid: active.kid, alg: active.alg, privateKey };
        return;
      } catch (e) {
        // Private material is missing (e.g., after restart with in-memory store)
        // Rotate a fresh key and retire the broken active key.
        this.logger.warn({ kid: active.kid, ref: active.privateRef, err: (e as Error).message }, 'Active key private material missing; rotating new key');
        await this.rotateKeys();
        return;
      }
    }
    await this.rotateKeys();
  }

  async rotateKeys(): Promise<void> {
    const alg = 'RS256';
    const { publicKey, privateKey } = await generateKeyPair(alg);
    const publicJwk = await exportJWK(publicKey);
    const privateJwk = await exportJWK(privateKey);
    const kid = randomUUID();
    (publicJwk as any).kid = kid;
    (publicJwk as any).alg = alg;
    const privateRef = await this.storePrivateJwk(kid, privateJwk);

    const keyEntity = this.keyRepo.create({
      kid,
      alg,
      publicJwk: publicJwk as any,
      privateRef,
      notBefore: new Date(Date.now() - 60 * 1000), // overlap 1 min
      status: 'active',
    });
    await this.keyRepo.save(keyEntity);

    // retire older keys
    await this.keyRepo
      .createQueryBuilder()
      .update(Key)
      .set({ status: 'retired', notAfter: new Date() })
      .where('kid != :kid AND status = :status', { kid, status: 'active' })
      .execute();

    this.activeKey = { kid, alg, privateKey };
    this.logger.info({ kid }, 'Active signing key rotated');
  }

  async getJwks(): Promise<{ keys: Record<string, unknown>[] }> {
    const keys = await this.keyRepo.find({
      where: [{ status: 'active' }, { status: 'retired' }],
      order: { notBefore: 'DESC' },
    });
    return { keys: keys.map((k) => ({ ...k.publicJwk, kid: k.kid, alg: k.alg })) as any };
  }

  async signJwt(payload: JWTPayload, audience: string, subject?: string): Promise<string> {
    await this.ensureActiveKey();
    const active = this.activeKey!;
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: active.alg, kid: active.kid, typ: 'JWT' })
      .setIssuer(this.config.domain.issuerUrl)
      .setAudience(audience)
      .setIssuedAt(now)
      .setSubject((subject ?? (payload.sub as string)) as string)
      .setExpirationTime('5m')
      .sign(active.privateKey as KeyLike);
    return token;
  }

  async verifyJwt<T extends JWTPayload = JWTPayload>(token: string): Promise<{ payload: T }> {
    const header = decodeProtectedHeader(token);
    const kid = header.kid;
    if (!kid) throw new Error('Missing kid');
    // Use cached imported public key if available and not expired
    const cached = this.publicKeyCache.get(kid);
    let publicKey: KeyLike;
    if (cached && cached.expiresAt > Date.now()) {
      publicKey = cached.key;
    } else {
      const keyEntity = await this.keyRepo.findOne({ where: { kid } });
      if (!keyEntity) throw new Error('Unknown key');
      publicKey = (await importJWK(keyEntity.publicJwk as any, keyEntity.alg)) as KeyLike;
      // refresh LRU ordering and set TTL
      this.publicKeyCache.delete(kid);
      this.publicKeyCache.set(kid, { key: publicKey, expiresAt: Date.now() + this.publicKeyTtlMs });
      // Trim naive LRU if cache grows too large (defensive)
      if (this.publicKeyCache.size > 2000) {
        const oldest = this.publicKeyCache.keys().next().value as string | undefined;
        if (oldest) this.publicKeyCache.delete(oldest);
      }
    }
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: this.config.domain.issuerUrl,
    });
    return { payload: payload as T };
  }

  // In-memory private JWK store (replace with real KMS/provider in prod)
  private readonly inMemoryPrivates = new Map<string, JWK>();
  private async storePrivateJwk(kid: string, jwk: JWK): Promise<string> {
    const ref = `memory:${kid}`;
    this.inMemoryPrivates.set(ref, jwk);
    return ref;
  }
  private async loadPrivateJwk(ref: string): Promise<JWK> {
    const jwk = this.inMemoryPrivates.get(ref);
    if (!jwk) throw new Error(`Private key not found for ref=${ref}`);
    return jwk;
  }
}


