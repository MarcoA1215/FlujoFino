import { IsString, IsNumber, IsOptional } from 'class-validator';

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
}

