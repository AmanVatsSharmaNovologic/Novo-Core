/**
* File: src/shared/config/config.factory.ts
* Module: shared/config
* Purpose: Build and validate application configuration from environment variables
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Uses Zod runtime validation and safe defaults for DX
* - Pretty logs in development, JSON logs in production
*/

import { z } from 'zod';
import { AppConfig, NodeEnvironment } from './config.types';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('novo-core'),
  PORT: z.coerce.number().int().positive().default(3000),
  GLOBAL_PREFIX: z.string().default(''),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  LOG_PRETTY: z.coerce.boolean().default(true),
  ISSUER_URL: z.string().url().default('https://auth.novologic.co'),
  PUBLIC_BASE_URL: z.string().url().default('https://auth.novologic.co'),
  COOKIE_DOMAIN: z.string().default('.novologic.co'),
  COOKIE_SECURE: z.coerce.boolean().default(true),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CORS_ORIGINS: z.string().default('https://app.novologic.co,https://invoice.novologic.co'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default('novologic'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_SSL: z.coerce.boolean().default(false),
});

export function buildAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const v = parsed.data;
  const isProd = v.NODE_ENV === 'production';
  const pretty = v.LOG_PRETTY && !isProd;

  const config: AppConfig = {
    env: v.NODE_ENV as NodeEnvironment,
    name: v.APP_NAME,
    http: {
      port: v.PORT,
      globalPrefix: v.GLOBAL_PREFIX,
    },
    log: {
      level: v.LOG_LEVEL,
      pretty,
    },
    cookie: {
      domain: v.COOKIE_DOMAIN,
      secure: v.COOKIE_SECURE,
      sameSite: v.COOKIE_SAMESITE,
    },
    cors: {
      allowedOrigins: v.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
      allowCredentials: v.CORS_CREDENTIALS,
    },
    domain: {
      issuerUrl: v.ISSUER_URL,
      publicBaseUrl: v.PUBLIC_BASE_URL,
      cookieDomain: v.COOKIE_DOMAIN,
    },
    db: {
      host: v.DB_HOST,
      port: v.DB_PORT,
      name: v.DB_NAME,
      user: v.DB_USER,
      password: v.DB_PASSWORD,
      ssl: v.DB_SSL,
    },
  };
  return config;
}


