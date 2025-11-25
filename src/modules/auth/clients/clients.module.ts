/**
* File: src/modules/auth/clients/clients.module.ts
* Module: modules/auth/clients
* Purpose: Module providing ClientService
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Exports repository and service
*/

import { Module } from '@nestjs/common';
import { ClientService } from './services/client.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientsModule {}


