import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubscribePushDto {
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @IsNotEmpty()
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  @IsOptional()
  @IsString()
  negocioId?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
