/**
 * @file identity.entity.ts
 * @module modules/auth/entities
 * @description Global identity (user) across all organisations/tenants.
 *              Intended to back multi-tenant memberships and central auth creds.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'identities' })
export class Identity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash?: string;

  @Column({ type: 'boolean', default: false })
  mfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'disabled';

  @Column({ type: 'jsonb', nullable: true })
  profile?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


