import { TenantPlanType, TenantStatus, UpdateTenantPlanDTO } from '@finowork/shared-types';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTenantPlanDto implements UpdateTenantPlanDTO {
  @IsOptional()
  @IsEnum(TenantPlanType)
  planType?: TenantPlanType;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsNumber()
  extendDays?: number;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsString()
  referredByTenantId?: string | null;
}
