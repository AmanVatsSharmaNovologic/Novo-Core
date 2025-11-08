/**
* File: src/modules/auth/entities/session.entity.ts
* Module: modules/auth/entities
* Purpose: User session entity for device tracking and refresh rotation
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - One session holds multiple refresh tokens (rotation chain)
*/

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'sessions' })
@Index(['tenantId', 'userId'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


