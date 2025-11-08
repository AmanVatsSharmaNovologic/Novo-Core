/**
 * @file typeorm.adapter.ts
 * @module modules/auth/oidc-provider
 * @description TypeORM adapter for `oidc-provider` models backed by a generic JSON store.
 *              Also bridges Client lookups to the existing `clients` table.
 * @author BharatERP
 * @created 2025-11-08
 */

import { DataSource, Repository } from 'typeorm';
import { OidcStorage } from '../entities/oidc-storage.entity';
import { Client } from '../entities/client.entity';

type Payload = Record<string, unknown>;

/**
 * Factory that returns an Adapter class compatible with `oidc-provider`.
 * The returned class constructor receives the `name` (model) and operates
 * against the OidcStorage repository (except for Client, which maps to `clients`).
 */
export function createTypeOrmAdapterClass(dataSource: DataSource): new (name: string) => any {
  // Repositories are resolved once to avoid cost on every instance
  const storageRepo: Repository<OidcStorage> = dataSource.getRepository(OidcStorage);
  const clientRepo: Repository<Client> = dataSource.getRepository(Client);

  return class TypeOrmAdapter {
    private readonly name: string;
    constructor(name: string) {
      this.name = name;
    }

    // create or update a record
    async upsert(id: string, payload: Payload, expiresIn?: number): Promise<void> {
      if (this.name === 'Client') {
        // `oidc-provider` can manage dynamic clients; we map to our own table only for find()
        // Ignore upserts for Client to keep authoritative store in our `clients` table
        return;
      }
      const expiresAt = typeof expiresIn === 'number' ? new Date(Date.now() + expiresIn * 1000) : undefined;
      const grantId = (payload as any).grantId as string | undefined;
      const userCode = (payload as any).userCode as string | undefined;
      const uid = (payload as any).uid as string | undefined;
      const row = storageRepo.create({
        id,
        kind: this.name,
        payload,
        grantId,
        userCode,
        uid,
        expiresAt,
      });
      await storageRepo.save(row);
    }

    // find by primary id
    async find(id: string): Promise<Payload | undefined> {
      if (this.name === 'Client') {
        const client = await clientRepo.findOne({ where: { clientId: id } });
        if (!client) return undefined;
        // Translate to OIDC client shape
        return {
          client_id: client.clientId,
          client_secret: client.clientSecretHash ? '__hashed__' : undefined,
          redirect_uris: client.redirectUris,
          post_logout_redirect_uris: client.postLogoutRedirectUris,
          grant_types: client.grantTypes,
          response_types: ['code'],
          token_endpoint_auth_method: client.clientSecretHash ? 'client_secret_post' : 'none',
          scope: client.scopes?.join(' '),
          firstParty: client.firstParty,
        } as unknown as Payload;
      }
      const row = await storageRepo.findOne({ where: { id, kind: this.name } });
      if (!row) return undefined;
      return this.enrich(row);
    }

    // find by user code
    async findByUserCode(userCode: string): Promise<Payload | undefined> {
      const row = await storageRepo.findOne({ where: { userCode, kind: this.name } });
      return row ? this.enrich(row) : undefined;
    }

    // find by uid
    async findByUid(uid: string): Promise<Payload | undefined> {
      const row = await storageRepo.findOne({ where: { uid, kind: this.name } });
      return row ? this.enrich(row) : undefined;
    }

    // mark as consumed
    async consume(id: string): Promise<void> {
      await storageRepo.update({ id, kind: this.name }, { consumedAt: new Date() });
    }

    // remove single record
    async destroy(id: string): Promise<void> {
      await storageRepo.delete({ id, kind: this.name });
    }

    // revoke all records by grant id (e.g., during logout)
    async revokeByGrantId(grantId: string): Promise<void> {
      await storageRepo
        .createQueryBuilder()
        .delete()
        .from(OidcStorage)
        .where('kind = :kind AND grant_id = :grantId', { kind: this.name, grantId })
        .execute();
    }

    // Helper: enrich payload with consumed and remaining TTL if needed
    private enrich(row: OidcStorage): Payload {
      const payload = { ...(row.payload as Payload) };
      if (row.consumedAt) (payload as any).consumed = true;
      if (row.expiresAt) {
        const ttl = Math.max(0, Math.floor((row.expiresAt.getTime() - Date.now()) / 1000));
        (payload as any).exp = Math.floor(Date.now() / 1000) + ttl;
      }
      return payload;
    }
  };
}


