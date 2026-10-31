import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { AppUpdateItem, UpdateAppUpdateDTO } from '@finowork/shared-types';

export class UpdateAppUpdateDto implements UpdateAppUpdateDTO {
  @IsOptional()
  @IsString()
  title?: string;

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

  @IsOptional()
  @IsArray()
  changes?: AppUpdateItem[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
