import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateRawMaterialDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() minStockAlert?: number;
}

