import { IsNumber, IsOptional } from 'class-validator';

export class AddStockDto {
  @IsNumber()
  additionalStock: number;

  @IsOptional()
  @IsNumber()
  newCost?: number;
}
