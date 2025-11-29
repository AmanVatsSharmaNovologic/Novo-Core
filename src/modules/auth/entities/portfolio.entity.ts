/**
 * @file portfolio.entity.ts
 * @module modules/auth/entities
 * @description Portfolio entity representing a logical collection of projects within an organisation (e.g. Residential, Commercial).
 * @author BharatERP
 * @created 2025-11-29
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'portfolios' })
@Index(['tenantId', 'name'], { unique: false })
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 256 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED' | 'OTHER';

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'archived';

  @Column({ type: 'varchar', length: 512, nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}



