import { PlatformConfigDTO } from '@nutrideli/shared-types';

export class UpdatePlatformConfigDto implements PlatformConfigDTO {
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
  companyAccountNumber?: string;
  companyAccountHolder?: string;
  binancePayId?: string;
  binanceEmail?: string;
  defaultMonthlyPrice?: number;
  defaultTrialDays?: number;
}
