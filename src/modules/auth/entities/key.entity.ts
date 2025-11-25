/**
* File: src/modules/auth/entities/key.entity.ts
* Module: modules/auth/entities
* Purpose: JWK key metadata for signing tokens with rotation
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - private material is referenced, not stored (privateRef)
*/

import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'keys' })
export class Key {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  kid!: string;

  @Column({ type: 'varchar', length: 12 })
  alg!: string;

  @Column({ type: 'jsonb' })
  publicJwk!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255 })
  privateRef!: string;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  notBefore?: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  notAfter?: Date;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'pending' | 'retired';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}


