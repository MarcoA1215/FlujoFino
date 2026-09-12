import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsNumber() salePrice: number;
  @IsOptional() isCombo?: boolean;
}

