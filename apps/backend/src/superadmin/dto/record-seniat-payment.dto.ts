import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecordSeniatPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
  @IsOptional()
  amountBs?: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsNotEmpty()
  taxPeriod: string;

  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;
}
