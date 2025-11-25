/**
* File: src/main.ts
* Module: app
* Purpose: Application bootstrap; wires config, CORS, and logging
* Author: Aman Sharma / Novologic
 * Last-updated: 2025-11-25
* Notes:
* - Uses typed AppConfig and Pino LoggerService
* - Sets global prefix and dynamic CORS for novologic subdomains
*/
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './shared/logger';
import { AppConfig, CONFIG_DI_TOKEN } from './shared/config/config.types';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get<AppConfig>(CONFIG_DI_TOKEN);
  const logger = app.get(LoggerService);

  if (config.http.globalPrefix) {
    app.setGlobalPrefix(config.http.globalPrefix);
  }

  // Basic security middlewares (must run before routes)
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false, // GraphQL/Yoga and EJS views manage their own scripts/styles
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableCors({
    credentials: config.cors.allowCredentials,
    origin: (origin, callback) => {
      // Allow same-origin or non-browser (e.g., curl, Postman)
      if (!origin) return callback(null, true);
      const allowed = config.cors.allowedOrigins.some((o) => origin === o) ||
        origin.endsWith('.novologic.co');
      return allowed ? callback(null, true) : callback(new Error('CORS blocked by policy'));
    },
  });

  // EJS views for login/consent under module path
  app.setBaseViewsDir(join(process.cwd(), 'src', 'modules', 'auth', 'oidc', 'views'));
  app.setViewEngine('ejs');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  await app.listen(config.http.port);
  logger.info({ port: config.http.port, env: config.env }, '🚀 NovoLogic core started');
}
bootstrap();
