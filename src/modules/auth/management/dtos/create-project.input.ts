/**
 * @file create-project.input.ts
 * @module modules/auth/management
 * @description GraphQL input for creating a construction project within a portfolio.
 * @author BharatERP
 * @created 2025-11-29
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class CreateProjectInput {
  @Field(() => ID)
  @IsUUID()
  tenantId!: string;

  @Field(() => ID)
  @IsUUID()
  portfolioId!: string;

  @Field()
  @IsString()
  @MaxLength(256)
  name!: string;

  @Field()
  @IsString()
  @MaxLength(64)
  code!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}



