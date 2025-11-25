/**
* File: src/modules/auth/entities/authorization-code.entity.ts
* Module: modules/auth/entities
* Purpose: Authorization Code entity for OAuth2/OIDC code flow with PKCE
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Stores only codeHash, not raw code
*/

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Client } from './client.entity';

@Entity({ name: 'authorization_codes' })
@Index(['tenantId', 'clientId'])
export class AuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid' })
  clientId!: string;
  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  codeHash!: string;

  @Column({ type: 'varchar', length: 2048 })
  redirectUri!: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  scope?: string;

  @Column({ type: 'varchar', length: 10, default: 'S256' })
  codeChallengeMethod!: 'S256' | 'plain';

  @Column({ type: 'varchar', length: 128 })
  codeChallenge!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}


