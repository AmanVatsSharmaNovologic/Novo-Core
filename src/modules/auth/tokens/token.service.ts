/**
* File: src/modules/auth/tokens/token.service.ts
* Module: modules/auth/tokens
* Purpose: Issue access and ID tokens using JwkService
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Access token TTL short; ID token for OIDC relying parties
*/

import { Injectable } from '@nestjs/common';
import { JwkService } from '../../../shared/crypto/jwk.service';

@Injectable()
export class TokenService {
  constructor(private readonly jwk: JwkService) {}

  async issueAccessToken(subject: string, audience: string, claims: Record<string, unknown> = {}): Promise<string> {
    return this.jwk.signJwt(
      {
        sub: subject,
        scope: claims['scope'] as string | undefined,
        ...claims,
      },
      audience,
      subject,
    );
  }
}


