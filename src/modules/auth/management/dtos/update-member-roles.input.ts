/**
 * @file update-member-roles.input.ts
 * @module modules/auth/management
 * @description GraphQL input to assign roles to a member within a tenant.
 * @author BharatERP
 * @created 2025-11-24
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

@InputType()
export class UpdateMemberRolesInput {
  @Field(() => ID)
  @IsString()
  tenantId!: string;

  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleNames!: string[];
}


