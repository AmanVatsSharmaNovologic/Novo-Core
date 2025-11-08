/**
 * @file accept-invitation.dto.ts
 * @module modules/auth/management
 * @description DTO to accept an invitation and set password for new user.
 * @author BharatERP
 * @created 2025-11-08
 */

import { IsString, Length } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @Length(32, 512)
  token!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}


