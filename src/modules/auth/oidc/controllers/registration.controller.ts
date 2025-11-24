/**
 * @file registration.controller.ts
 * @module modules/auth/oidc
 * @description Public registration controller for SPA sign-up (global realm).
 * @author BharatERP
 * @created 2025-11-24
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PublicRegisterDto } from '../dtos/public-register.dto';
import { PublicRegistrationService } from '../services/public-registration.service';
import { LoggerService } from '../../../../shared/logger';

@Controller('/public')
export class RegistrationController {
  constructor(
    private readonly registration: PublicRegistrationService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Public registration endpoint.
   * - Accepts { email, password } as JSON.
   * - Creates a global Identity (auto-verified/active) and, when possible, a
   *   platform-tenant User + Membership.
   * - Returns a minimal payload that the SPA can use to confirm registration.
   */
  @Post('/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: PublicRegisterDto): Promise<{ identityId: string; email: string }> {
    this.logger.info({ email: body.email }, 'Handling public registration request');
    const result = await this.registration.register(body.email, body.password);
    return result;
  }
}



