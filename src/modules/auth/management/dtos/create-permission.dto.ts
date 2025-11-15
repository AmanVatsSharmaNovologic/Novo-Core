/**
* File: src/modules/auth/management/dtos/create-permission.dto.ts
* Module: modules/auth/management
* Description: DTO for creating a permission.
* Author: BharatERP
* @created 2025-11-15
*/

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  key!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  description?: string;
}


