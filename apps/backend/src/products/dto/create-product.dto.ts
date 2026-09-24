import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsNumber() salePrice: number;
  @IsOptional() @IsNumber() estimatedCost?: number;
  @IsOptional() @IsNumber() durationMinutes?: number;
  @IsOptional() @IsBoolean() isCombo?: boolean;
  @IsOptional() @IsBoolean() isPreAssembled?: boolean;
}
