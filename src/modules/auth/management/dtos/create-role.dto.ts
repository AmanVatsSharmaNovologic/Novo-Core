/**
* File: src/modules/auth/management/dtos/create-role.dto.ts
* Module: modules/auth/management
* Description: DTO for creating a role.
* Author: BharatERP
* @created 2025-11-15
*/

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  description?: string;
}


