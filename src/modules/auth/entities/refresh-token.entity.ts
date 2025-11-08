/**
* File: src/modules/auth/entities/refresh-token.entity.ts
* Module: modules/auth/entities
* Purpose: Refresh token entity with rotation and reuse detection
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - tokenHash indexed; never store raw token
*/

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Session } from './session.entity';

@Entity({ name: 'refresh_tokens' })
@Index(['tenantId', 'sessionId'])
@Index(['tenantId', 'tokenHash'])
export class RefreshToken {
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
  sessionId!: string;
  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: Session;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  rotatedFromId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}


