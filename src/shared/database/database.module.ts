/**
* File: src/shared/database/database.module.ts
* Module: shared/database
* Purpose: TypeORM global database module with snake_case naming and UUIDs
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Loads connection options from typed AppConfig
* - autoLoadEntities for modular entity registration
*/

import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig, CONFIG_DI_TOKEN } from '../config/config.types';
import { SnakeNamingStrategy } from './snake-naming.strategy';
import { join } from 'path';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [CONFIG_DI_TOKEN],
      useFactory: (config: AppConfig) => {
        const db = config.db!;
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          database: db.name,
          username: db.user,
          password: db.password,
          schema: db.schema,
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: false,
          logging: ['error', 'schema'],
          uuidExtension: 'uuid-ossp',
          namingStrategy: new SnakeNamingStrategy(),
          migrations: [
            join(__dirname, '../../migrations/*{.ts,.js}'),
            join(process.cwd(), 'dist', 'migrations', '*.js'),
          ],
          migrationsRun: Boolean(db.migrationsRun),
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}


