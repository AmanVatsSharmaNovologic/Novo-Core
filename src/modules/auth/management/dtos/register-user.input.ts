/**
* File: src/modules/auth/management/dtos/register-user.input.ts
* Module: modules/auth/management
* Purpose: DTO for registering a new user
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsUUID, MinLength } from 'class-validator';

@InputType()
export class RegisterUserInput {
  @Field()
  @IsUUID('4')
  tenantId!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(8)
  password!: string;
}


