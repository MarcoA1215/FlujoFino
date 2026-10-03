import { IsBoolean, IsOptional } from 'class-validator';

export class ArchiveRawMaterialDto {
  @IsOptional()
  @IsBoolean()
  removeFromRecipes?: boolean;
}
