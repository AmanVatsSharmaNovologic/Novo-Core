/**
 * @file oidc-provider.service.ts
 * @module modules/auth/oidc-provider
 * @description Service that initializes `oidc-provider` (when enabled) and exposes an Express callback.
 *              This is gated by the OIDC_PROVIDER env flag to avoid route conflicts with existing OIDC controllers.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig, CONFIG_DI_TOKEN } from '../../../shared/config/config.types';
import { Inject } from '@nestjs/common';
import { LoggerService } from '../../../shared/logger';
import { JwkService } from '../../../shared/crypto/jwk.service';
import { createTypeOrmAdapterClass } from './typeorm.adapter';

@Injectable()
export class OidcProviderService {
  private readonly enabled: boolean;
  private provider: any | null = null;
  private expressCallback: any | null = null;

  constructor(
    @Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly jwk: JwkService,
  ) {
    this.enabled = `${process.env.OIDC_PROVIDER ?? ''}`.toLowerCase() === 'true';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Lazily initialize the OIDC provider instance.
   * Note: We intentionally avoid hard import to not require the dependency unless enabled.
   */
  private async ensureProvider(): Promise<void> {
    if (!this.enabled) return;
    if (this.provider) return;
    let Provider: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Provider = require('oidc-provider');
    } catch (e) {
      this.logger.warn({ err: (e as Error).message }, 'oidc-provider package not installed; skipping enablement');
      return;
    }
    try {
      // Build keystore from current JwkService active key
      await this.jwk.ensureActiveKey();
      // Build adapter class bound to our TypeORM DataSource
      const AdapterClass = createTypeOrmAdapterClass(this.dataSource);
      const issuer = this.config.domain.issuerUrl;
      const configuration = {
        // Adapter for all models (client, session, grant, etc.)
        adapter: AdapterClass,
        // Minimal feature set: enforce PKCE S256, enable refresh tokens via 'offline_access'
        features: {
          devInteractions: { enabled: false },
          pkce: { required: () => true, methods: ['S256'] },
          revocation: { enabled: true },
          clientCredentials: { enabled: true },
          introspection: { enabled: true },
        },
        // Audience and token defaults; cookie domain matches *.novologic.co
        cookies: {
          long: { signed: true },
          short: { signed: true },
          names: {
            session: '_op',
            resume: '_op_resume',
          },
          keys: [process.env.OIDC_COOKIE_KEY || 'dev-unsafe-cookie-key-change-me'],
        },
        // Define which claims are returned by default
        claims: {
          openid: ['sub'],
          profile: ['name'],
          email: ['email', 'email_verified'],
        },
        // Map accountId -> claims; keep minimal shape for now
        findAccount: async (_ctx: unknown, id: string) => ({
          accountId: id,
          claims: async (_use: string, _scope: string, _claims: Record<string, unknown>, _rejected: string[]) => ({
            sub: id,
          }),
        }),
        ttl: {
          AccessToken: 5 * 60, // 5 minutes
          AuthorizationCode: 10 * 60,
          RefreshToken: 30 * 24 * 60 * 60, // 30 days
        },
      };
      this.provider = new Provider(issuer, configuration);
      // Express-compatible handler
      this.expressCallback = this.provider.callback();
      this.logger.info({ issuer }, 'oidc-provider initialized');
    } catch (e) {
      this.logger.error({ err: (e as Error).stack }, 'Failed to initialize oidc-provider');
      this.provider = null;
      this.expressCallback = null;
    }
  }

  /**
   * Returns an Express middleware callback for mounting the provider.
   * If disabled or unavailable, returns null.
   */
  async getExpressCallback(): Promise<any | null> {
    if (!this.enabled) return null;
    await this.ensureProvider();
    return this.expressCallback;
  }
}


