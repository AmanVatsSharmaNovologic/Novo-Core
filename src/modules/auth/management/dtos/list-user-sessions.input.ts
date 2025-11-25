/**
 * @file list-user-sessions.input.ts
 * @module modules/auth/management
 * @description GraphQL input for listing sessions for a specific user within a tenant.
 * @author BharatERP
 * @created 2025-11-25
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class ListUserSessionsInput {
  @Field(() => ID)
  @IsUUID()
  tenantId!: string;

  @Field(() => ID)
  @IsUUID()
  userId!: string;
}


