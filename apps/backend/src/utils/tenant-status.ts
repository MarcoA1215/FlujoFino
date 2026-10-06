import { Tenant } from '../entities/tenant.entity';
import { TenantStatus, TenantPlanType } from '@finowork/shared-types';

export function isTenantSuspendedOrExpired(tenant: Tenant): boolean {
  if (!tenant.isActive) return true;
  if (tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.PAST_DUE) {
    return true;
  }


  const now = Date.now();
  if (tenant.status === TenantStatus.TRIAL) {
    const trialEnd = tenant.trial_ends_at
      ? new Date(tenant.trial_ends_at).getTime()
      : new Date(tenant.createdAt).getTime() + 15 * 86400000;
    return now > trialEnd;
  }
  if (tenant.status === TenantStatus.ACTIVE && tenant.current_period_ends_at) {
    return now > new Date(tenant.current_period_ends_at).getTime();
  }
  return false;
}

