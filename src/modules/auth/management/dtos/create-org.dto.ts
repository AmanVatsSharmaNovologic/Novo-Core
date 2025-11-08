/**
 * @file create-org.dto.ts
 * @module modules/auth/management
 * @description DTO for creating an organisation (tenant) with initial owner invitation.
 * @author BharatERP
 * @created 2025-11-08
 */

import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  @Length(3, 96)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, digits, and hyphens' })
  slug!: string;

  @IsString()
  @Length(3, 256)
  name!: string;

  @IsEmail()
  ownerEmail!: string;
}


