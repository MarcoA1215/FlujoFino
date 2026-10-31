import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AppUpdateItem, CreateAppUpdateDTO } from '@finowork/shared-types';

export class CreateAppUpdateDto implements CreateAppUpdateDTO {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsNumber()
  versionCode?: number;

  @IsOptional()
  @IsString()
  apkUrl?: string;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @IsNumber()
  graceDays?: number;

  @IsOptional()
  @IsString()
  fileSizeMb?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  changes: AppUpdateItem[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
