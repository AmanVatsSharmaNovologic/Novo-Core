/**
 * @file create-team.input.ts
 * @module modules/auth/management
 * @description GraphQL input for creating a team within a project.
 * @author BharatERP
 * @created 2025-11-29
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class CreateTeamInput {
  @Field(() => ID)
  @IsUUID()
  tenantId!: string;

  @Field(() => ID)
  @IsUUID()
  projectId!: string;

  @Field()
  @IsString()
  @MaxLength(256)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  kind?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;
}



