import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PushSubscriptionKeysDto {
  @IsOptional()
  @IsString()
  p256dh?: string;

  @IsOptional()
  @IsString()
  auth?: string;
}

export class PushSubscriptionDataDto {
  @IsNotEmpty()
  @IsString()
  endpoint: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys?: PushSubscriptionKeysDto;
}

export class SubscribePushDto {
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PushSubscriptionDataDto)
  subscription: PushSubscriptionDataDto;

  @IsOptional()
  @IsString()
  negocioId?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
