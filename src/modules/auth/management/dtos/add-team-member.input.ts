/**
 * @file add-team-member.input.ts
 * @module modules/auth/management
 * @description GraphQL input for adding a user as a member of a team.
 * @author BharatERP
 * @created 2025-11-29
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class AddTeamMemberInput {
  @Field(() => ID)
  @IsUUID()
  tenantId!: string;

  @Field(() => ID)
  @IsUUID()
  teamId!: string;

  @Field(() => ID)
  @IsUUID()
  userId!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  roleName?: string;
}



