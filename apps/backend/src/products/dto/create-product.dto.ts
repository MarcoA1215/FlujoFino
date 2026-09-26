import { IsString, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsNumber() salePrice: number;
  @IsOptional() @IsNumber() estimatedCost?: number;
  @IsOptional() @IsNumber() durationMinutes?: number;
  @IsOptional() @IsBoolean() isCombo?: boolean;
  @IsOptional() @IsBoolean() isPreAssembled?: boolean;
  @IsOptional() @IsArray() assignedStaffIds?: string[];
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsNumber() stock?: number;
  @IsOptional() @IsNumber() stockQuantity?: number;
  @IsOptional() @IsBoolean() is_service?: boolean;
  @IsOptional() @IsString() product_type?: string;
}
