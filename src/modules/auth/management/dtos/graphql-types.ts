/**
* File: src/modules/auth/management/dtos/graphql-types.ts
* Module: modules/auth/management
* Purpose: GraphQL types for management API
* Author: Aman Sharma / Novologic
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

/**
 * GraphQL view of an organisation (tenant) for front-end admin UX.
 */
@ObjectType()
export class OrgGql {
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
export class RoleGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@ObjectType()
export class PermissionGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  key!: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

/**
 * Combined view of a member within an organisation, suitable for team
 * management UIs (email + roles within a tenant).
 */
@ObjectType()
export class OrgMemberGql {
  @Field(() => ID)
  userId!: string;

  @Field()
  tenantId!: string;

  @Field()
  email!: string;

  @Field()
  status!: string;

  @Field(() => [String])
  roles!: string[];
}

@ObjectType()
export class InvitationResultGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  email!: string;

  @Field()
  roleName!: string;

  @Field()
  token!: string;

  @Field()
  expiresAt!: string;
}


