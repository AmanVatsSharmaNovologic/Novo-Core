/**
 * @file revoke-session.input.ts
 * @module modules/auth/management
 * @description GraphQL input for revoking a single session within a tenant.
 * @author BharatERP
 * @created 2025-11-25
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class RevokeSessionInput {
  @Field(() => ID)
  @IsUUID()
  tenantId!: string;

  @Field(() => ID)
  @IsUUID()
  sessionId!: string;
}


