import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { PlatformExpenseType } from '@finowork/shared-types';

export class CreatePlatformExpenseDto {
  @IsEnum(PlatformExpenseType)
  @IsNotEmpty()
  type: PlatformExpenseType;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

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
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  expenseDate?: string;

  @IsString()
  @IsOptional()
  taxPeriod?: string;

  @IsString()
  @IsOptional()
  promoterId?: string;
}
