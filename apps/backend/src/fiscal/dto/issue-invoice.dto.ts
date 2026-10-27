import { IsString, IsOptional, IsUUID } from 'class-validator';

export class IssueInvoiceDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsString()
  customerName: string;

  @IsString()
  customerRif: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
