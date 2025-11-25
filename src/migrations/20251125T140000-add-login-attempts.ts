/**
* File: src/migrations/20251125T140000-add-login-attempts.ts
* Module: migrations
* Purpose: Add login_attempts table used by LoginAttemptsService and LoginAttempt entity.
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-25
*/

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoginAttempts20251125140000 implements MigrationInterface {
  name = 'AddLoginAttempts20251125140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email varchar(320) NOT NULL,
        ip varchar(64) NOT NULL,
        count int NOT NULL DEFAULT 0,
        last_attempt_at timestamptz NULL,
        locked_until timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, email, ip)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_tenant_id ON login_attempts(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS login_attempts`);
  }
}


