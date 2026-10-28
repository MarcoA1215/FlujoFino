import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppUpdateItem, CreateAppUpdateDTO } from '@finowork/shared-types';

export class CreateAppUpdateDto implements CreateAppUpdateDTO {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  changes: AppUpdateItem[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
