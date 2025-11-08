/**
 * @file oidc-storage.entity.ts
 * @module modules/auth/entities
 * @description Generic storage for `oidc-provider` models (grants, sessions, codes).
 * @author BharatERP
 * @created 2025-11-08
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'oidc_storage' })
@Index(['kind', 'grantId'])
@Index(['kind', 'userCode'])
@Index(['kind', 'uid'])
export class OidcStorage {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  kind!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  grantId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userCode?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uid?: string;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


