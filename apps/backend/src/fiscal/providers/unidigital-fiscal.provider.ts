import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  FiscalInvoiceStatus,
  FiscalProviderType,
} from '@finowork/shared-types';
import {
  IFiscalProvider,
  IssueFiscalInvoiceParams,
  FiscalInvoiceResult,
  CancelFiscalInvoiceParams,
  FiscalCancelResult,
} from '../interfaces/fiscal-provider.interface';

@Injectable()
export class UnidigitalFiscalProvider implements IFiscalProvider {
  readonly providerType = FiscalProviderType.UNIDIGITAL;
  private readonly logger = new Logger(UnidigitalFiscalProvider.name);

  async issueInvoice(
    params: IssueFiscalInvoiceParams,
    tenantSettings: any,
  ): Promise<FiscalInvoiceResult> {
    this.logger.log(`Preparando factura para UniDigital - Tenant: ${params.tenantId}`);

    const apiKey = tenantSettings?.unidigitalApiKey;
    const apiSecret = tenantSettings?.unidigitalApiSecret;

    if (!apiKey || !apiSecret) {
      this.logger.warn(`Tenant ${params.tenantId} no tiene credenciales de UniDigital configuradas`);
      throw new BadRequestException(
        'El negocio no tiene configuradas las credenciales de UniDigital (API Key / Secret) en Ajustes Fiscales.',
      );
    }

    // Estructura oficial requerida por UniDigital DigitalInvoice API:
    const unidigitalPayload = {
      issuer: {
        rif: tenantSettings?.fiscalRif,
        name: tenantSettings?.fiscalCompanyName,
        address: tenantSettings?.fiscalAddress,
        phone: tenantSettings?.fiscalPhone,
      },
      customer: {
        rif: params.customerRif,
        name: params.customerName,
        address: params.customerAddress || 'Ciudad',
        phone: params.customerPhone || '',
      },
      document: {
        type: params.documentType || 'FACTURA',
        date: new Date().toISOString(),
        currency: 'VES',
        exchangeRate: params.exchangeRate,
        subtotalExempt: params.subtotalExempt,
        taxableBase: params.taxableBase,
        taxRate: params.taxRate,
        taxAmount: params.taxAmount,
        totalUSD: params.totalAmount,
        totalVES: params.amountBs,
      },
      items: params.items.map((item, idx) => ({
        lineNumber: idx + 1,
        code: item.productId || `ITM-${idx + 1}`,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxExempt: item.isTaxExempt,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        subtotal: item.subtotal,
      })),
    };

    // En la Fase 2, dejamos la pasarela preparada retornando el estado PENDING_FISCAL
    // con un GUID simulado o listo para el conector HTTP de la Fase 3.
    const mockGuid = `ud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      status: FiscalInvoiceStatus.PENDING_FISCAL,
      provider: this.providerType,
      invoiceNumber: 'PROVISIONAL',
      externalGuid: mockGuid,
      metadata: {
        provider: 'UNIDIGITAL_DIGITALINVOICE_API',
        stage: 'GATEWAY_PREPARED',
        payloadSent: unidigitalPayload,
        note: 'Esperando resolución asíncrona de Número de Control Fiscal del SENIAT',
      },
    };
  }

  async cancelInvoice(
    params: CancelFiscalInvoiceParams,
    tenantSettings: any,
  ): Promise<FiscalCancelResult> {
    this.logger.log(`Preparando anulación en UniDigital para factura ${params.originalInvoiceNumber}`);

    if (!tenantSettings?.unidigitalApiKey) {
      throw new BadRequestException('Credenciales de UniDigital no configuradas');
    }

    const mockGuid = `nc-ud-${Date.now()}`;
    return {
      success: true,
      status: FiscalInvoiceStatus.PENDING_FISCAL,
      externalGuid: mockGuid,
      metadata: {
        originalInvoiceNumber: params.originalInvoiceNumber,
        originalControlNumber: params.originalControlNumber,
        reason: params.reason,
      },
    };
  }

  async checkStatus(
    externalGuid: string,
    _tenantSettings: any,
  ): Promise<FiscalInvoiceResult> {
    this.logger.log(`Consultando estatus de GUID UniDigital: ${externalGuid}`);
    return {
      success: true,
      status: FiscalInvoiceStatus.PENDING_FISCAL,
      provider: this.providerType,
      invoiceNumber: externalGuid,
      externalGuid,
    };
  }
}
