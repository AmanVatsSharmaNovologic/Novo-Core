/**
 * @file membership.entity.ts
 * @module modules/auth/entities
 * @description Membership mapping between a global Identity and a Tenant (organisation).
 *              Transitional field `userId` links legacy per-tenant users for migration paths.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Identity } from './identity.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'memberships' })
@Index(['identityId', 'tenantId'], { unique: true })
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  identityId!: string;
  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identity_id' })
  identity!: Identity;

  @Column({ type: 'uuid' })
  tenantId!: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  // Transitional mapping to legacy users table (nullable)
  @Column({ type: 'uuid', nullable: true })
  userId?: string;
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'pending' | 'disabled';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


