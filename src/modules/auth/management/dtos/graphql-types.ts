/**
* File: src/modules/auth/management/dtos/graphql-types.ts
* Module: modules/auth/management
* Purpose: GraphQL types for management API
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TenantGql {
  @Field(() => ID)
  id!: string;
  @Field()
  slug!: string;
  @Field()
  name!: string;
  @Field()
  status!: string;
}

@ObjectType()
export class UserGql {
  @Field(() => ID)
  id!: string;
  @Field()
  tenantId!: string;
  @Field()
  email!: string;
  @Field()
  status!: string;
}


