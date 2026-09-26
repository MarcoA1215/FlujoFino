import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ProductArchetype {
  REVENTA = 'REVENTA',   // Compra-Venta directa (stock y costo propio)
  FORMULA = 'FORMULA',   // Armable / Manufacturado con insumos
  SERVICIO = 'SERVICIO', // Cita / Atención de servicio (agenda, duración)
}

export class ConvertProductTypeDto {
  @IsEnum(ProductArchetype)
  targetType: ProductArchetype;

  @IsOptional()
  @IsNumber()
  initialStock?: number;

  @IsOptional()
  @IsString()
  newCategory?: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;
}
