import { IsString, IsNumber } from 'class-validator';

export class RegisterLossDto {
  @IsNumber() quantity: number;
  @IsString() reason: string;
}

