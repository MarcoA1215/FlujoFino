import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InvestmentType } from '@finowork/shared-types';

export class CreateInvestmentDto {
  @IsEnum(InvestmentType)
  @IsNotEmpty()
  type: InvestmentType;

  @IsNumber()
  @Min(0.01)
  amountUSD: number;

  @IsOptional()
  @IsNumber()
  amountBS?: number;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  date?: string;
}
