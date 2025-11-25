/**
* File: src/modules/auth/tokens/token.service.ts
* Module: modules/auth/tokens
* Purpose: Issue access and ID tokens using JwkService
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Access token TTL short; ID token for OIDC relying parties
*/

import { Injectable } from '@nestjs/common';
import { JwkService } from '../../../shared/crypto/jwk.service';

/**
 * Shape of access token claims issued for NovoLogic APIs.
 * - User tokens: include org_id, sid, roles, permissions, scope, etc.
 * - Client credentials tokens: omit permissions, use sub=client:<id>, scope, grant, azp.
 *
 * This intentionally remains extensible so we can add new fields
 * without breaking existing microservices.
 */
export interface AccessTokenClaims {
  scope?: string;
  org_id?: string;
  sid?: string;
  roles?: string[];
  permissions?: string[];
  grant?: string;
  azp?: string;
  // Allow future claim extensions without type breakage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwk: JwkService) {}

  async issueAccessToken(subject: string, audience: string, claims: AccessTokenClaims = {}): Promise<string> {
    return this.jwk.signJwt(
      {
        sub: subject,
        scope: claims.scope,
        ...claims,
      },
      audience,
      subject,
    );
  }
}


