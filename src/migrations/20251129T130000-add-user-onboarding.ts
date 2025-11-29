/**
* File: src/migrations/20251129T130000-add-user-onboarding.ts
* Module: migrations
* Purpose: Add onboardingStep and onboardedAt columns to users table for first-time onboarding flows.
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-29
*/

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserOnboarding20251129130000 implements MigrationInterface {
  name = 'AddUserOnboarding20251129130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS onboarding_step varchar(32) NOT NULL DEFAULT 'NONE',
      ADD COLUMN IF NOT EXISTS onboarded_at timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS onboarding_step,
      DROP COLUMN IF EXISTS onboarded_at
    `);
  }
}



