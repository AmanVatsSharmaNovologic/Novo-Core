/**
 * @file 20251201T000000-add-email-verification.ts
 * @module migrations
 * @description Migration: add email verification table and identity email verification fields
 * @author BharatERP
 * @created 2025-12-01
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification20251201000000 implements MigrationInterface {
  name = 'AddEmailVerification20251201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email verification fields to identities table
    await queryRunner.query(`
      ALTER TABLE identities
      ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL;
    `);

    // Create email_verifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
        email varchar(320) NOT NULL,
        token_hash varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        verified_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_email_verifications_identity ON email_verifications(identity_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verifications_token_hash ON email_verifications(token_hash)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_verifications`);
    await queryRunner.query(`
      ALTER TABLE identities
      DROP COLUMN IF EXISTS email_verified_at,
      DROP COLUMN IF EXISTS email_verified;
    `);
  }
}

