import { CreatePromoterDTO } from '@nutrideli/shared-types';

export class CreatePromoterDto implements CreatePromoterDTO {
  username: string;
  email: string;
  password?: string;
  code?: string;
  phone?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  binancePayId?: string;
}

