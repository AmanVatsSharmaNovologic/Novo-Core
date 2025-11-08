/**
* File: src/modules/auth/passwords/password.service.ts
* Module: modules/auth/passwords
* Purpose: Argon2id password hashing and verification with policy checks
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Never store raw passwords; always compare using verify()
*/

import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hashPassword(plain: string): Promise<string> {
    this.ensurePolicy(plain);
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain, { type: argon2.argon2id });
  }

  private ensurePolicy(password: string): void {
    if (password.length < 8) {
      throw new Error('Password too short');
    }
    // Basic policy placeholder; extend with zxcvbn/HIBP checks later
  }
}


