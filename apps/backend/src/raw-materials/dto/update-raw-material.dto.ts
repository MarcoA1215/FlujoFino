import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateRawMaterialDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() minStockAlert?: number;
  @IsOptional() @IsBoolean() allowAsExtra?: boolean;
  @IsOptional() @IsString() extraPriceType?: 'COST' | 'MARGIN_PERCENT' | 'FIXED_PRICE';
  @IsOptional() @IsNumber() extraPriceValue?: number;
}

