import { SaaSPaymentMethod } from '@finowork/shared-types';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ReportPaymentDto {
  @IsNumber()
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsOptional()
  @IsNumber()
  amount_bs?: number;

  @IsOptional()
  @IsNumber()
  exchange_rate?: number;

  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  payment_method: SaaSPaymentMethod;

  @IsString()
  @IsNotEmpty({ message: 'La referencia de pago es obligatoria' })
  reference: string;
}
