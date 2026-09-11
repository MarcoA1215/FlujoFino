import { IsNumber } from 'class-validator';

export class RestockRawMaterialDto {
  @IsNumber()
  quantity: number;

  @IsNumber()
  totalCost: number;
}

