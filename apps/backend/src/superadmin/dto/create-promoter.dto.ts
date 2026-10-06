import { CreatePromoterDTO } from '@finowork/shared-types';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePromoterDto implements CreatePromoterDTO {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  pagoMovilPhone?: string;

  @IsOptional()
  @IsString()
  pagoMovilCedula?: string;

  @IsOptional()
  @IsString()
  pagoMovilBank?: string;

  @IsOptional()
  @IsString()
  binancePayId?: string;
}
