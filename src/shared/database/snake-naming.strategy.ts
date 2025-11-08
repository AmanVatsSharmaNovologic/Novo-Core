/**
* File: src/shared/database/snake-naming.strategy.ts
* Module: shared/database
* Purpose: TypeORM naming strategy for snake_case tables/columns/relations
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Avoids bringing external packages for naming strategy
*/

import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .toLowerCase();
}

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName?: string): string {
    return customName ? customName : toSnakeCase(className);
  }
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return toSnakeCase([...embeddedPrefixes, customName ?? propertyName].join('_'));
  }
  relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }
  joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }
  joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string, _secondPropertyName: string): string {
    return toSnakeCase(`${firstTableName}_${firstPropertyName}_${secondTableName}`);
  }
  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return toSnakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}


