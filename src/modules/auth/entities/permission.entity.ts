/**
* File: src/modules/auth/entities/permission.entity.ts
* Module: modules/auth/entities
* Purpose: Permission entity for RBAC within tenant scope
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - key unique per tenant
*/

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'permissions' })
@Index(['tenantId', 'key'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 160 })
  key!: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


