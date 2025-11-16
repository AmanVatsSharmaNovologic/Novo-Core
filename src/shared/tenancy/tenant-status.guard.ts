/**
 * @file tenant-status.guard.ts
 * @module shared/tenancy
 * @description Guard that blocks requests for suspended tenants
 * @author BharatERP
 * @created 2025-11-16
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../modules/auth/entities/tenant.entity';
import { RequestContext } from '../request-context';
import { AppError } from '../../common/errors';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(@InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Apply only for HTTP requests
    if (context.getType() !== 'http') return true;
    const tenantId = RequestContext.get()?.tenantId;
    if (!tenantId) return true;
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) return true;
    if (tenant.status === 'suspended') {
      throw new AppError('FORBIDDEN', 'Tenant is suspended');
    }
    return true;
  }
}


