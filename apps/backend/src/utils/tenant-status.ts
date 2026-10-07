import { Tenant } from '../entities/tenant.entity';
import { TenantStatus } from '@finowork/shared-types';

export function isTenantSuspendedOrExpired(tenant: Tenant): boolean {
  if (!tenant.isActive) return true;
  // Solo SUSPENDIDO bloquea totalmente el acceso a la plataforma.
  // PAST_DUE (Vencido) mantiene acceso a la app con alerta y días de gracia.
  if (tenant.status === TenantStatus.SUSPENDED) {
    return true;
  }
  if (tenant.status === TenantStatus.PAST_DUE) {
    return false;
  }

  const now = Date.now();
  if (tenant.status === TenantStatus.TRIAL) {
    const trialEnd = tenant.trial_ends_at
      ? new Date(tenant.trial_ends_at).getTime()
      : new Date(tenant.createdAt).getTime() + 15 * 86400000;
    return now > trialEnd;
  }

  return false;
}

