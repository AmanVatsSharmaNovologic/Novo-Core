/**
 * @file public-register.dto.ts
 * @module modules/auth/oidc
 * @description DTO for public registration endpoint (email + password)
 * @author BharatERP
 * @created 2025-11-24
 */

import { IsEmail, MinLength } from 'class-validator';

export class PublicRegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}



