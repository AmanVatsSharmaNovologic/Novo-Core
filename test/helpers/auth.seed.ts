/**
 * @file auth.seed.ts
 * @module tests/helpers
 * @description Seed helpers for tenants, users, roles, permissions, and clients
 * @author BharatERP
 * @created 2025-11-16
 */

import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from '../../src/modules/auth/entities/tenant.entity';
import { User } from '../../src/modules/auth/entities/user.entity';
import { Client } from '../../src/modules/auth/entities/client.entity';
import { Role } from '../../src/modules/auth/entities/role.entity';
import { Permission } from '../../src/modules/auth/entities/permission.entity';
import { UserRole } from '../../src/modules/auth/entities/user-role.entity';
import { RolePermission } from '../../src/modules/auth/entities/role-permission.entity';
import { PasswordService } from '../../src/modules/auth/passwords/services/password.service';

export interface SeedResult {
  tenant: Tenant;
  user: User;
  password: string;
  clientPublic: Client;
  clientConfidential: Client;
  role: Role;
  permission: Permission;
}

export async function seedAuth(app: INestApplication, tenantSlug = 'acme'): Promise<SeedResult> {
  const ds = app.get(DataSource);
  const tenants = ds.getRepository(Tenant) as Repository<Tenant>;
  const users = ds.getRepository(User) as Repository<User>;
  const clients = ds.getRepository(Client) as Repository<Client>;
  const roles = ds.getRepository(Role) as Repository<Role>;
  const perms = ds.getRepository(Permission) as Repository<Permission>;
  const userRoles = ds.getRepository(UserRole) as Repository<UserRole>;
  const rolePerms = ds.getRepository(RolePermission) as Repository<RolePermission>;
  const passwords = app.get(PasswordService);

  let tenant = await tenants.findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    tenant = tenants.create({ slug: tenantSlug, name: 'Acme Inc.' });
    tenant = await tenants.save(tenant);
  }

  const plainPassword = 'Password123!';
  const hash = await passwords.hashPassword(plainPassword);
  let user = await users.findOne({ where: { tenantId: tenant.id, email: 'user@acme.test' } });
  if (!user) {
    user = users.create({
      tenantId: tenant.id,
      email: 'user@acme.test',
      passwordHash: hash,
      status: 'active',
    });
    user = await users.save(user);
  }

  let role = await roles.findOne({ where: { tenantId: tenant.id, name: 'tenant_admin' } });
  if (!role) {
    role = roles.create({ tenantId: tenant.id, name: 'tenant_admin' });
    role = await roles.save(role);
  }
  let permission = await perms.findOne({ where: { tenantId: tenant.id, key: 'users:read' } });
  if (!permission) {
    permission = perms.create({ tenantId: tenant.id, key: 'users:read' });
    permission = await perms.save(permission);
  }
  const existingRolePerm = await rolePerms.findOne({ where: { tenantId: tenant.id, roleId: role.id, permissionId: permission.id } });
  if (!existingRolePerm) {
    await rolePerms.save(rolePerms.create({ tenantId: tenant.id, roleId: role.id, permissionId: permission.id }));
  }
  const existingUserRole = await userRoles.findOne({ where: { tenantId: tenant.id, userId: user.id, roleId: role.id } });
  if (!existingUserRole) {
    await userRoles.save(userRoles.create({ tenantId: tenant.id, userId: user.id, roleId: role.id }));
  }

  let clientPublic = await clients.findOne({ where: { tenantId: tenant.id, clientId: 'app-spa' } });
  if (!clientPublic) {
    clientPublic = clients.create({
      tenantId: tenant.id,
      clientId: 'app-spa',
      grantTypes: ['authorization_code'],
      redirectUris: ['https://app.example/callback'],
      postLogoutRedirectUris: ['https://app.example'],
      scopes: ['openid', 'profile', 'email'],
      firstParty: true,
    });
    clientPublic = await clients.save(clientPublic);
  }

  let clientConfidential = await clients.findOne({ where: { tenantId: tenant.id, clientId: 'svc-api' } });
  if (!clientConfidential) {
    const secretHash = await passwords.hashPassword('supersecret');
    clientConfidential = clients.create({
      tenantId: tenant.id,
      clientId: 'svc-api',
      clientSecretHash: secretHash,
      grantTypes: ['client_credentials'],
      redirectUris: [],
      postLogoutRedirectUris: [],
      scopes: ['read:all'],
      firstParty: false,
    });
    clientConfidential = await clients.save(clientConfidential);
  }

  return { tenant, user, password: plainPassword, clientPublic, clientConfidential, role, permission };
}


