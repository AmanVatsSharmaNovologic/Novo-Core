/**
 * @file create-org.input.ts
 * @module modules/auth/management
 * @description GraphQL input for creating an organisation (tenant) via /graphql.
 * @author BharatERP
 * @created 2025-11-24
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';

@InputType()
export class CreateOrgInput {
  @Field()
  @IsString()
  @Length(3, 96)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, digits, and hyphens' })
  slug!: string;

  @Field()
  @IsString()
  @Length(3, 256)
  name!: string;
}


