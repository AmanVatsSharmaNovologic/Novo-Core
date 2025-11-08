/**
* File: src/modules/auth/oidc/controllers/revoke.controller.ts
* Module: modules/auth/oidc
* Purpose: OAuth2 Token Revocation - placeholder
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RequestContext } from '../../../../shared/request-context';
import { AuditService } from '../../audit/audit.service';

class RevokeDto {
  token!: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}

@Controller('/revoke')
export class RevokeController {
  constructor(private readonly audit: AuditService) {}

  @Post()
  @HttpCode(200)
  async revoke(@Body() _body: RevokeDto) {
    const tenantId = RequestContext.get()?.tenantId;
    if (tenantId) {
      await this.audit.logEvent({ tenantId, type: 'token.revoke' });
    }
    return {};
  }
}


