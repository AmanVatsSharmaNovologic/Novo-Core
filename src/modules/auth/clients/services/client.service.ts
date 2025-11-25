/**
* File: src/modules/auth/clients/services/client.service.ts
* Module: modules/auth/clients
* Purpose: Client lookup and utilities
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-24
* Notes:
* - Supports tenant-scoped and global realm clients (isGlobalRealm)
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

  /**
   * Find a global realm client by clientId.
   * Used for apps like the main dashboard SPA that do not require tenant
   * to be provided on /authorize; internally, such clients still have a tenantId.
   */
  async findGlobalByClientId(clientId: string): Promise<Client | null> {
    return this.repo.findOne({ where: { clientId, isGlobalRealm: true } });
  }

  /**
   * Resolve a client given an optional tenantId and a clientId:
   * - First try tenant-scoped lookup when tenantId is provided.
   * - Fallback to global realm client (isGlobalRealm=true) when not found.
   * Returns the resolved client and the effective tenantId.
   */
  async resolveClient(
    tenantId: string | undefined,
    clientId: string,
  ): Promise<{ client: Client | null; tenantId: string | undefined }> {
    if (tenantId) {
      const byTenant = await this.findByClientId(tenantId, clientId);
      if (byTenant) {
        return { client: byTenant, tenantId };
      }
    }
    const globalClient = await this.findGlobalByClientId(clientId);
    if (globalClient) {
      return { client: globalClient, tenantId: globalClient.tenantId };
    }
    return { client: null, tenantId };
  }

  isRedirectAllowed(client: Client, redirectUri: string): boolean {
    return client.redirectUris.includes(redirectUri);
  }
}


