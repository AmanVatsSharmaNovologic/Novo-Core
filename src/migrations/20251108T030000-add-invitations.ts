/**
 * @file 20251108T030000-add-invitations.ts
 * @module migrations
 * @description Migration: add invitations table for invite-only onboarding
 * @author BharatERP
 * @created 2025-11-08
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitations20251108030000 implements MigrationInterface {
  name = 'AddInvitations20251108030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email varchar(320) NOT NULL,
        token_hash varchar(255) NOT NULL,
        role_name varchar(64) NOT NULL DEFAULT 'member',
        inviter_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        expires_at timestamptz NOT NULL,
        accepted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_invitations_tenant_email ON invitations(tenant_id, email)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS invitations`);
  }
}


