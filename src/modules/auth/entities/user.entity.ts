/**
* File: src/modules/auth/entities/user.entity.ts
* Module: modules/auth/entities
* Purpose: User entity with tenant scope and auth profile
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Email unique per tenant (composite unique)
*/

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'users' })
@Index(['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'boolean', default: false })
  mfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'disabled';

  @Column({ type: 'jsonb', nullable: true })
  profile?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32, default: 'NONE' })
  onboardingStep!: 'NONE' | 'PROFILE' | 'ORG_SETUP' | 'DONE';

  @Column({ type: 'timestamptz', nullable: true })
  onboardedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


