/**
 * @file create-invitation.dto.ts
 * @module modules/auth/management
 * @description DTO for creating an invitation for a tenant.
 * @author BharatERP
 * @created 2025-11-08
 */

import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Length(3, 64)
  roleName?: string;
}


