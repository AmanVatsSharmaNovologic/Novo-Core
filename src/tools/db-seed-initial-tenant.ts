/**
 * @file db-seed-initial-tenant.ts
 * @module tools/db-seed-initial-tenant
 * @description Seed an initial Tenant and first-party SPA Client (app-spa) for sandbox2.novologic.co
 * @author BharatERP
 * @created 2025-11-24
 */

import { DataSource } from 'typeorm';
import { buildAppConfig } from '../shared/config/config.factory';
import { LoggerFactory } from '../shared/logger';
import { SnakeNamingStrategy } from '../shared/database/snake-naming.strategy';
import { Tenant } from '../modules/auth/entities/tenant.entity';
import { Client } from '../modules/auth/entities/client.entity';

async function main(): Promise<void> {
  const config = buildAppConfig();
  const logger = LoggerFactory.create(config).child({ scope: 'db-seed-initial-tenant' });

  const db = config.db!;

  const tenantSlug = process.env.SEED_TENANT_SLUG || 'novologic';
  const tenantName = process.env.SEED_TENANT_NAME || 'NovoLogic Sandbox';
  const clientId = process.env.SEED_CLIENT_ID || 'app-spa';
  const redirectUri =
    process.env.SEED_CLIENT_REDIRECT_URI || 'https://sandbox2.novologic.co/auth/callback';

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
    entities: [Tenant, Client],
  });

  try {
    logger.info(
      {
        host: db.host,
        db: db.name,
        schema: db.schema,
        tenantSlug,
        clientId,
        redirectUri,
      },
      'Seeding initial tenant and SPA client...',
    );
    await dataSource.initialize();

    const tenantRepo = dataSource.getRepository(Tenant);
    const clientRepo = dataSource.getRepository(Client);

    let tenant = await tenantRepo.findOne({ where: { slug: tenantSlug } });
    if (!tenant) {
      tenant = tenantRepo.create({
        slug: tenantSlug,
        name: tenantName,
        status: 'active',
      });
      tenant = await tenantRepo.save(tenant);
      logger.info({ tenantId: tenant.id, slug: tenant.slug }, 'Created tenant');
    } else {
      logger.info({ tenantId: tenant.id, slug: tenant.slug }, 'Tenant already exists');
    }

    let client = await clientRepo.findOne({
      where: { tenantId: tenant.id, clientId },
    });
    if (!client) {
      client = clientRepo.create({
        tenantId: tenant.id,
        clientId,
        firstParty: true,
        isGlobalRealm: true,
        redirectUris: [redirectUri],
        postLogoutRedirectUris: [redirectUri],
        grantTypes: ['authorization_code', 'refresh_token'],
        scopes: ['openid', 'profile', 'email', 'offline_access'],
      });
      client = await clientRepo.save(client);
      logger.info({ clientId: client.clientId, id: client.id }, 'Created SPA client');
    } else {
      if (!client.isGlobalRealm) {
        client.isGlobalRealm = true;
        client = await clientRepo.save(client);
        logger.info({ clientId: client.clientId, id: client.id }, 'Marked SPA client as global realm');
      } else {
        logger.info({ clientId: client.clientId, id: client.id }, 'SPA client already exists as global realm');
      }
    }

    logger.info(
      { tenantId: tenant.id, clientId: client.clientId },
      'Seed completed. Use tenantId as NEXT_PUBLIC_TENANT_ID on the frontend.',
    );

    await dataSource.destroy();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Seed failed');
    try {
      await dataSource.destroy();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

void main();


