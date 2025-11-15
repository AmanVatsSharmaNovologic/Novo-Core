/**
* File: src/modules/auth/entities/login-attempt.entity.ts
* Module: modules/auth/entities
* Description: Tracks failed login attempts per (tenant, email, ip) with optional lockout.
* Author: BharatERP
* @created 2025-11-15
*/

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'login_attempts' })
@Index(['tenantId', 'email', 'ip'], { unique: true })
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  ip!: string;

  @Column({ type: 'int', default: 0 })
  count!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastAttemptAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


