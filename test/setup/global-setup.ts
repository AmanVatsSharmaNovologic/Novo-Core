/**
 * @file global-setup.ts
 * @module tests/setup
 * @description Jest global setup: start Postgres Testcontainer and set env
 * @author BharatERP
 * @created 2025-11-16
 */

import { PostgreSqlContainer } from '@testcontainers/postgresql';

module.exports = async () => {
  const container = await new PostgreSqlContainer()
    .withDatabase('novologic')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DB_MIGRATIONS_RUN = 'true';
  // safer defaults for test
  process.env.NODE_ENV = 'test';
  process.env.ISSUER_URL = 'https://auth.test.local';
  process.env.PUBLIC_BASE_URL = 'https://auth.test.local';
  process.env.COOKIE_DOMAIN = 'localhost';
  process.env.COOKIE_SECURE = 'false';
  (global as any).__TESTCONTAINER__ = container;
};


