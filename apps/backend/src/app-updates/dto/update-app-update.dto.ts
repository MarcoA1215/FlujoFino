import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { AppUpdateItem, UpdateAppUpdateDTO } from '@finowork/shared-types';

export class UpdateAppUpdateDto implements UpdateAppUpdateDTO {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  version?: string;

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
