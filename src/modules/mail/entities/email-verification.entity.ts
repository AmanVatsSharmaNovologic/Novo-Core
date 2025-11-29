/**
 * @file email-verification.entity.ts
 * @module modules/mail/entities
 * @description Email verification token entity for storing verification requests
 * @author BharatERP
 * @created 2025-12-01
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Identity } from '../../auth/entities/identity.entity';

@Entity({ name: 'email_verifications' })
@Index(['identityId'])
@Index(['tokenHash'], { unique: true })
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  identityId!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identity_id' })
  identity!: Identity;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

