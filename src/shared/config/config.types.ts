/**
* File: src/shared/config/config.types.ts
* Module: shared/config
* Purpose: Type-safe application configuration interfaces and tokens
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Defines AppConfig and nested sections for typed access across the app
* - Read alongside config.factory.ts for defaults & validation
*/

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface HttpConfig {
  port: number;
  globalPrefix: string;
}

export interface LogConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
  pretty: boolean;
}

export interface CookieConfig {
  domain: string;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
}

export interface CorsConfig {
  allowedOrigins: string[];
  allowCredentials: boolean;
}

export interface DomainConfig {
  issuerUrl: string;
  publicBaseUrl: string;
  cookieDomain: string;
}

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  fromName: string;
}

export interface AppConfig {
  env: NodeEnvironment;
  name: string;
  http: HttpConfig;
  log: LogConfig;
  cookie: CookieConfig;
  cors: CorsConfig;
  domain: DomainConfig;
  mail?: MailConfig;
  db?: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    schema?: string; 
    migrationsRun?: boolean;
  };
}

export const CONFIG_DI_TOKEN = 'APP_CONFIG_TOKEN';


