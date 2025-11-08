/**
* File: src/tools/db-migrate.ts
* Module: tools/db-migrate
* Purpose: Run TypeORM migrations programmatically using app config
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Reads DB config from buildAppConfig()
* - Safe to run locally or in CI
*/

import { DataSource } from 'typeorm';
import { join } from 'path';
import { buildAppConfig } from '../shared/config/config.factory';
import { LoggerFactory } from '../shared/logger';
import { SnakeNamingStrategy } from '../shared/database/snake-naming.strategy';

async function main(): Promise<void> {
  const config = buildAppConfig();
  const logger = LoggerFactory.create(config);
  const db = config.db!;

  const dataSource = new DataSource({
    type: 'postgres',
    host: db.host,
    port: db.port,
    database: db.name,
    username: db.user,
    password: db.password,
    schema: db.schema,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    logging: ['error', 'schema'],
    namingStrategy: new SnakeNamingStrategy() as any,
    migrations: [join(process.cwd(), 'src', 'migrations', '*.{ts,js}')],
  });

  try {
    logger.info({ host: db.host, db: db.name, schema: db.schema }, 'Running migrations...');
    await dataSource.initialize();
    const res = await dataSource.runMigrations();
    for (const m of res) {
      logger.info({ name: m.name }, 'Migration executed');
    }
    logger.info({ count: res.length }, 'Migrations finished');
    await dataSource.destroy();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Migration failed');
    try {
      await dataSource.destroy();
    } catch {}
    process.exit(1);
  }
}

main();


