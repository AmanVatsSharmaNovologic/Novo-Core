/**
 * @file 20251108T020000-add-identity-membership.ts
 * @module migrations
 * @description Migration: introduce global identities and memberships for multi-tenant accounts
 * @author BharatERP
 * @created 2025-11-08
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdentityMembership20251108020000 implements MigrationInterface {
  name = 'AddIdentityMembership20251108020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS identities (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email varchar(320) NOT NULL UNIQUE,
        password_hash varchar(255) NULL,
        mfa_enabled boolean NOT NULL DEFAULT false,
        status varchar(24) NOT NULL DEFAULT 'active',
        profile jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        status varchar(24) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (identity_id, tenant_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_memberships_identity ON memberships(identity_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON memberships(tenant_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS memberships`);
    await queryRunner.query(`DROP TABLE IF EXISTS identities`);
  }
}


