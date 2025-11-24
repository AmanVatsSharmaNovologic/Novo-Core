/**
 * @file create-role.input.ts
 * @module modules/auth/management
 * @description GraphQL input for creating a role within a tenant.
 * @author BharatERP
 * @created 2025-11-24
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateRoleInput {
  @Field(() => ID)
  @IsString()
  tenantId!: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  description?: string;
}


