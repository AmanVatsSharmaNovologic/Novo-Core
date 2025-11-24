/**
 * @file 20251124T120000-add-client-global-realm.ts
 * @module migrations
 * @description Migration: add is_global_realm flag on clients for global realm apps (e.g., app-spa)
 * @author BharatERP
 * @created 2025-11-24
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientGlobalRealm20251124120000 implements MigrationInterface {
  name = 'AddClientGlobalRealm20251124120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_global_realm boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS is_global_realm`);
  }
}


