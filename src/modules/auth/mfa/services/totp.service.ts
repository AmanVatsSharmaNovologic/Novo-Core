/**
* File: src/modules/auth/mfa/services/totp.service.ts
* Module: modules/auth/mfa
* Purpose: TOTP MFA generation and verification with backup codes
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
*/

import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { randomBytes, randomUUID } from 'crypto';

export interface TotpSecret {
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class TotpService {
  generateSecret(label: string, issuer: string): TotpSecret {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(label, issuer, secret);
    return { secret, otpauthUrl };
  }

  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const buf = randomBytes(8).toString('hex');
      codes.push(`${buf}-${randomUUID().slice(0, 4)}`);
    }
    return codes;
  }
}


