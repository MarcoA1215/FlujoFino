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
  @IsOptional() @IsNumber() physicalStock?: number;
  @IsOptional() @IsString() availabilityType?: 'INMEDIATO' | 'BAJO_ENCARGO';
  @IsOptional() @IsBoolean() isSupplierPreorder?: boolean;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() is_service?: boolean;
  @IsOptional() @IsBoolean() isService?: boolean;
  @IsOptional() @IsString() product_type?: string;
  @IsOptional() @IsString() productType?: string;
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsBoolean() hasVariants?: boolean;
  @IsOptional() @IsArray() variants?: any[];
}
