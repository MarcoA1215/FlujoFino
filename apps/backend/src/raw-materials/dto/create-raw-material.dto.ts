import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateRawMaterialDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsNumber()
  costPerUnit: number;

  @IsOptional()
  @IsNumber()
  minStockAlert?: number;

  @IsOptional()
  @IsNumber()
  initialStock?: number;

  @IsOptional()
  @IsBoolean()
  allowAsExtra?: boolean;

  @IsOptional()
  @IsString()
  extraPriceType?: 'COST' | 'MARGIN_PERCENT' | 'FIXED_PRICE';

  @IsOptional()
  @IsNumber()
  extraPriceValue?: number;
}

