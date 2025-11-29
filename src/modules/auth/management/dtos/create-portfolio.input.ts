/**
 * @file create-portfolio.input.ts
 * @module modules/auth/management
 * @description GraphQL input for creating a portfolio within a tenant.
 * @author BharatERP
 * @created 2025-11-29
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class CreatePortfolioInput {
  @Field(() => ID)
  @IsUUID()
  tenantId!: string;

  @Field()
  @IsString()
  @MaxLength(256)
  name!: string;

  @Field()
  @IsString()
  @IsIn(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED', 'OTHER'])
  type!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;
}



