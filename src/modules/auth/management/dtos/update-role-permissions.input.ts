/**
 * @file update-role-permissions.input.ts
 * @module modules/auth/management
 * @description GraphQL input to assign permissions to a role within a tenant.
 * @author BharatERP
 * @created 2025-11-24
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

@InputType()
export class UpdateRolePermissionsInput {
  @Field(() => ID)
  @IsString()
  tenantId!: string;

  @Field(() => ID)
  @IsString()
  roleId!: string;

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionKeys!: string[];
}


