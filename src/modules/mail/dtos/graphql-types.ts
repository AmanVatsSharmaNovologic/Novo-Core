/**
 * @file graphql-types.ts
 * @module modules/mail/dtos
 * @description GraphQL types for email verification
 * @author BharatERP
 * @created 2025-12-01
 */

import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class VerifyEmailResult {
  @Field(() => String)
  identityId!: string;

  @Field(() => String)
  email!: string;

  @Field(() => Boolean)
  success!: boolean;
}

@ObjectType()
export class EmailVerificationStatus {
  @Field(() => Boolean)
  verified!: boolean;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  verifiedAt?: string;
}


