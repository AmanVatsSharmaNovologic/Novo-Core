/**
* File: src/modules/auth/management/dtos/set-role-permissions.dto.ts
* Module: modules/auth/management
* Description: DTO to assign permissions to a role.
* Author: BharatERP
* @created 2025-11-15
*/

import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionKeys!: string[];
}


