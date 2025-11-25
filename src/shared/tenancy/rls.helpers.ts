/**
* File: src/shared/tenancy/rls.helpers.ts
* Module: shared/tenancy
* Purpose: Helpers to set Postgres RLS tenant parameter for current transaction
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Use with an EntityManager or QueryRunner inside a transaction
*/

import { EntityManager, QueryRunner } from 'typeorm';

export async function setTenantRls(queryRunnerOrManager: QueryRunner | EntityManager, tenantId: string): Promise<void> {
  const qr = isQueryRunner(queryRunnerOrManager)
    ? queryRunnerOrManager
    : queryRunnerOrManager.queryRunner!;
  if (!qr) return;
  await qr.query(`SET LOCAL app.tenant_id = $1`, [tenantId]);
}

function isQueryRunner(obj: any): obj is QueryRunner {
  return !!obj && typeof obj === 'object' && 'query' in obj && 'manager' in obj;
}


