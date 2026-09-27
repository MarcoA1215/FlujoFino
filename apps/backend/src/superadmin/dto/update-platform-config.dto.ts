import { PlatformConfigDTO } from '@nutrideli/shared-types';
import { IsOptional, IsString, IsNumber, MaxLength, Min, Max } from 'class-validator';

export class UpdatePlatformConfigDto implements PlatformConfigDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyBank?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  companyCedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  companyPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  companyAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyAccountHolder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  binancePayId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  binanceEmail?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  defaultMonthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  defaultTrialDays?: number;
}
