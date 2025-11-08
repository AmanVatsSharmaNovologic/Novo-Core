/**
 * @file 20251108T010000-add-oidc-storage.ts
 * @module migrations
 * @description Migration: create generic OIDC storage table for oidc-provider adapter
 * @author BharatERP
 * @created 2025-11-08
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOidcStorage20251108010000 implements MigrationInterface {
  name = 'AddOidcStorage20251108010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS oidc_storage (
        id varchar(255) PRIMARY KEY,
        kind varchar(64) NOT NULL,
        payload jsonb NOT NULL,
        grant_id varchar(255) NULL,
        user_code varchar(255) NULL,
        uid varchar(255) NULL,
        expires_at timestamptz NULL,
        consumed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oidc_storage_kind_grant ON oidc_storage(kind, grant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oidc_storage_kind_user_code ON oidc_storage(kind, user_code)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oidc_storage_kind_uid ON oidc_storage(kind, uid)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oidc_storage_expires_at ON oidc_storage(expires_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS oidc_storage`);
  }
}


