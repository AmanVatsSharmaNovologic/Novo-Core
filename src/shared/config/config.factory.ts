/**
* File: src/shared/config/config.factory.ts
* Module: shared/config
* Purpose: Build and validate application configuration from environment variables
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Uses Zod runtime validation and safe defaults for DX
* - Pretty logs in development, JSON logs in production
*/

import * as dotenv from 'dotenv';
// Load .env into process.env for local/dev if present
try {
  dotenv.config();
} catch {}
 
import { z } from 'zod';
import { AppConfig, MailConfig, NodeEnvironment } from './config.types';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('novo-core'),
  PORT: z.coerce.number().int().positive().default(3000),
  GLOBAL_PREFIX: z.string().default(''),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  LOG_PRETTY: z.coerce.boolean().default(true),
  ISSUER_URL: z.string().url().default('https://api.novologic.co'),
  PUBLIC_BASE_URL: z.string().url().default('https://api.novologic.co'),
  COOKIE_DOMAIN: z.string().default('.novologic.co'),
  COOKIE_SECURE: z.coerce.boolean().default(true),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CORS_ORIGINS: z.string().default('https://app.novologic.co,https://sandbox2.novologic.co'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default('novologic'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_SSL: z.string().optional(),
  DB_MIGRATIONS_RUN: z.string().optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_SECURE: z.coerce.boolean().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  MAIL_FROM_NAME: z.string().optional(),
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

  // Prefer explicit env overrides, then DATABASE_URL, then schema defaults
  const hasEnv = (key: string): boolean =>
    Object.prototype.hasOwnProperty.call(env, key) && typeof env[key] !== 'undefined' && `${env[key]}` !== '';

  // Parse DATABASE_URL if provided
  const urlStr = env.DATABASE_URL as string | undefined;
  let urlParts: Partial<{
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    schema?: string;
    ssl?: boolean;
  }> = {};
  if (urlStr) {
    try {
      const u = new URL(urlStr);
      const sslMode = (u.searchParams.get('sslmode') || '').toLowerCase();
      const sslFlag = (u.searchParams.get('ssl') || '').toLowerCase();
      urlParts = {
        host: u.hostname,
        port: u.port ? Number(u.port) : 5432,
        name: u.pathname.replace(/^\//, ''),
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        schema: u.searchParams.get('schema') || undefined,
        ssl:
          ['require', 'verify-ca', 'verify-full'].includes(sslMode) ||
          ['1', 'true', 'yes'].includes(sslFlag),
      };
    } catch {
      // If URL parsing fails, proceed with validated env values
    }
  }

  // Resolve DB config with precedence: explicit env > DATABASE_URL > defaults
  const dbHost = hasEnv('DB_HOST') ? v.DB_HOST : (urlParts.host ?? v.DB_HOST);
  const dbPort = hasEnv('DB_PORT') ? v.DB_PORT : (urlParts.port ?? v.DB_PORT);
  const dbName = hasEnv('DB_NAME') ? v.DB_NAME : (urlParts.name ?? v.DB_NAME);
  const dbUser = hasEnv('DB_USER') ? v.DB_USER : (urlParts.user ?? v.DB_USER);
  const dbPassword = hasEnv('DB_PASSWORD') ? v.DB_PASSWORD : (urlParts.password ?? v.DB_PASSWORD);
  const parseBool = (raw: unknown): boolean => {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw !== 0;
    if (typeof raw === 'string') {
      const s = raw.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'on';
    }
    return false;
  };
  const dbSsl = hasEnv('DB_SSL') ? parseBool(env.DB_SSL) : (urlParts.ssl ?? false);
  const dbSchema = urlParts.schema;

  // Mail configuration (optional - only included if all required fields are present)
  let mailConfig: MailConfig | undefined;
  if (
    hasEnv('MAIL_HOST') &&
    hasEnv('MAIL_PORT') &&
    hasEnv('MAIL_USER') &&
    hasEnv('MAIL_PASSWORD') &&
    hasEnv('MAIL_FROM')
  ) {
    mailConfig = {
      host: v.MAIL_HOST!,
      port: v.MAIL_PORT!,
      secure: hasEnv('MAIL_SECURE') ? v.MAIL_SECURE! : true,
      user: v.MAIL_USER!,
      password: v.MAIL_PASSWORD!,
      from: v.MAIL_FROM!,
      fromName: v.MAIL_FROM_NAME || 'NovoLogic',
    };
  }

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
    mail: mailConfig,
    db: {
      host: dbHost,
      port: dbPort,
      name: dbName,
      user: dbUser,
      password: dbPassword,
      ssl: dbSsl,
      schema: dbSchema,
      migrationsRun: hasEnv('DB_MIGRATIONS_RUN') ? parseBool(env.DB_MIGRATIONS_RUN) : false,
    },
  };
  return config;
}


