import { SaaSPaymentMethod } from '@finowork/shared-types';

export class ReportPaymentDto {
  amount: number;
  amount_bs?: number;
  exchange_rate?: number;
  payment_method: SaaSPaymentMethod;
  reference: string;
}
