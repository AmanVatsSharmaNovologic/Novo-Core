/**
* File: src/modules/auth/passwords/services/password.service.ts
* Module: modules/auth/passwords
* Purpose: Argon2id password hashing and verification with policy checks
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hashPassword(plain: string): Promise<string> {
    this.ensurePolicy(plain);
    return argon2.hash(plain);
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  private ensurePolicy(password: string): void {
    if (password.length < 8) {
      throw new Error('Password too short');
    }
  }
}


