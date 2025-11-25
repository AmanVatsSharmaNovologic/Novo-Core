/**
* File: src/modules/auth/entities/tenant.entity.ts
* Module: modules/auth/entities
* Purpose: Tenant entity representing a logical organization (multi-tenant)
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - UUID v4 primary key
* - slug must be unique
*/

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 96 })
  slug!: string;

  @Column({ type: 'varchar', length: 256 })
  name!: string;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'suspended';

  @Column({ type: 'jsonb', nullable: true })
  branding?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


