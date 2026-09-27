import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateMovementDto {
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

