import { SaaSPaymentMethod } from '@nutrideli/shared-types';

export class ReportPaymentDto {
  amount: number;
  payment_method: SaaSPaymentMethod;
  reference: string;
}
