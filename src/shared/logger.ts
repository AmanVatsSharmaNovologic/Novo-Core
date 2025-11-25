/**
* File: src/shared/logger.ts
* Module: shared/logger
* Purpose: Pino-based LoggerService wrapper with requestId and context support
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Pretty transport in development, JSON in production
* - Provides child loggers with context fields and requestId
*/

import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { AppConfig, CONFIG_DI_TOKEN } from './config/config.types';
import { RequestContext } from './request-context';

function createPinoInstance(config: AppConfig): PinoLogger {
  const base = {
    app: config.name,
    env: config.env,
  };
  const options: LoggerOptions = {
    level: config.log.level,
    base,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({ pid: bindings.pid, host: bindings.hostname }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  const isPretty = config.log.pretty;
  if (isPretty) {
    // Dynamically require pino-pretty to avoid bundling in prod
    const transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: true,
        singleLine: false,
      },
    } as any;
    return pino({ ...options, transport });
  }
  return pino(options);
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService {
  private readonly logger: PinoLogger;

  constructor(@Inject(CONFIG_DI_TOKEN) private readonly config: AppConfig) {
    this.logger = createPinoInstance(config);
  }

  private withRequest(): PinoLogger {
    const ctx = RequestContext.get();
    if (!ctx) return this.logger;
    const requestId = ctx.requestId ?? undefined;
    const tenantId = ctx.tenantId ?? undefined;
    const userId = ctx.userId ?? undefined;
    return this.logger.child({ requestId, tenantId, userId });
  }

  child(context: Record<string, unknown>): LoggerService {
    const childLogger = this.withRequest().child(context);
    const svc = new LoggerService(this.config);
    (svc as any).logger = childLogger;
    return svc;
  }

  trace(obj: unknown, msg?: string) {
    this.withRequest().trace(obj as any, msg);
  }
  debug(obj: unknown, msg?: string) {
    this.withRequest().debug(obj as any, msg);
  }
  info(obj: unknown, msg?: string) {
    this.withRequest().info(obj as any, msg);
  }
  warn(obj: unknown, msg?: string) {
    this.withRequest().warn(obj as any, msg);
  }
  error(obj: unknown, msg?: string) {
    this.withRequest().error(obj as any, msg);
  }
  fatal(obj: unknown, msg?: string) {
    this.withRequest().fatal(obj as any, msg);
  }
}

export const LoggerFactory = {
  create: (config: AppConfig) => createPinoInstance(config),
};


