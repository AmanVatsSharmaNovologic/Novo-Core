/**
* File: src/modules/auth/entities/client.entity.ts
* Module: modules/auth/entities
* Purpose: OAuth/OIDC client entity
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - clientId unique per tenant
*/

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'clients' })
@Index(['tenantId', 'clientId'], { unique: true })
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 128 })
  clientId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientSecretHash?: string;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  redirectUris!: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  postLogoutRedirectUris!: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  grantTypes!: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  scopes!: string[];

  @Column({ type: 'boolean', default: true })
  firstParty!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


