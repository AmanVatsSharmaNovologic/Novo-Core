/**
* File: src/modules/auth/entities/audit-event.entity.ts
* Module: modules/auth/entities
* Purpose: Structured audit trail of auth/admin actions
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - actorId optional for system events
*/

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'audit_events' })
@Index(['tenantId', 'type'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid', nullable: true })
  actorId?: string;
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ type: 'varchar', length: 128 })
  type!: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  resource?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}


