import { FiscalDocumentType, FiscalInvoiceStatus, FiscalProviderType, FiscalInvoiceItemDTO } from '@finowork/shared-types';

export interface IssueFiscalInvoiceParams {
  orderId?: string | null;
  tenantId: string;
  customerName: string;
  customerRif: string;
  customerAddress?: string;
  customerPhone?: string;
  documentType?: FiscalDocumentType;
  items: FiscalInvoiceItemDTO[];
  subtotalExempt: number;
  taxableBase: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  exchangeRate: number;
  amountBs: number;
  paymentMethod?: string;
}

export interface FiscalInvoiceResult {
  success: boolean;
  status: FiscalInvoiceStatus;
  provider: FiscalProviderType;
  invoiceNumber: string;
  fiscalControlNumber?: string;
  series?: string;
  externalGuid?: string;
  qrCodeUrl?: string;
  pdfUrl?: string;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

export interface CancelFiscalInvoiceParams {
  invoiceId: string;
  tenantId: string;
  reason: string;
  originalInvoiceNumber: string;
  originalControlNumber?: string;
  originalExternalGuid?: string;
}

export interface FiscalCancelResult {
  success: boolean;
  status: FiscalInvoiceStatus;
  creditNoteNumber?: string;
  creditNoteControlNumber?: string;
  externalGuid?: string;
  pdfUrl?: string;
  qrCodeUrl?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface IFiscalProvider {
  readonly providerType: FiscalProviderType;
  issueInvoice(params: IssueFiscalInvoiceParams, tenantSettings: any): Promise<FiscalInvoiceResult>;
  cancelInvoice(params: CancelFiscalInvoiceParams, tenantSettings: any): Promise<FiscalCancelResult>;
  checkStatus(externalGuid: string, tenantSettings: any): Promise<FiscalInvoiceResult>;
}
