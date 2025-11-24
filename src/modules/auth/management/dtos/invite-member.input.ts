/**
 * @file invite-member.input.ts
 * @module modules/auth/management
 * @description GraphQL input for inviting a member to an organisation (tenant).
 * @author BharatERP
 * @created 2025-11-24
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

@InputType()
export class InviteMemberInput {
  @Field(() => ID)
  @IsString()
  tenantId!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 64)
  roleName?: string;
}


