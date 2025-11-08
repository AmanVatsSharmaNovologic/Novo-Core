/**
* File: src/modules/auth/clients/services/client.service.ts
* Module: modules/auth/clients
* Purpose: Client lookup and utilities
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
*/

import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Client } from '../../entities/client.entity';

@Injectable()
export class ClientService {
  private readonly repo: Repository<Client>;
  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Client);
  }

  async findByClientId(tenantId: string, clientId: string): Promise<Client | null> {
    return this.repo.findOne({ where: { tenantId, clientId } });
  }

  isRedirectAllowed(client: Client, redirectUri: string): boolean {
    return client.redirectUris.includes(redirectUri);
  }
}


