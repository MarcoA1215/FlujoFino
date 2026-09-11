import { IsNumber, IsString } from 'class-validator';

export class UpdateMovementDto {
  @IsNumber() quantity: number;
  @IsNumber() totalCost: number;
  @IsString() description: string;
}

