import { TenantPlanType, TenantStatus, UpdateTenantPlanDTO } from '@nutrideli/shared-types';

export class UpdateTenantPlanDto implements UpdateTenantPlanDTO {
  planType?: TenantPlanType;
  status?: TenantStatus;
  extendDays?: number;
  basePrice?: number;
}
