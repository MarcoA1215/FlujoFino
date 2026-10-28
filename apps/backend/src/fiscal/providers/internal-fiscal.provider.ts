import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalInvoice } from '../../entities/fiscal-invoice.entity';
import {
  FiscalDocumentType,
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
export class InternalFiscalProvider implements IFiscalProvider {
  readonly providerType = FiscalProviderType.INTERNAL;
  private readonly logger = new Logger(InternalFiscalProvider.name);

  constructor(private dataSource: DataSource) {}

  async issueInvoice(
    params: IssueFiscalInvoiceParams,
    tenantSettings: any,
  ): Promise<FiscalInvoiceResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bloqueo consultivo transaccional por tenant para evitar colisiones de correlativo
      await queryRunner.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`fiscal_${params.tenantId}`]);

      // Obtener el correlativo secuencial más alto para este tenant
      const lastInvoice = await queryRunner.manager
        .getRepository(FiscalInvoice)
        .createQueryBuilder('fi')
        .where('fi.tenantId = :tenantId AND fi.documentType = :docType', {
          tenantId: params.tenantId,
          docType: FiscalDocumentType.INVOICE,
        })
        .orderBy('fi.createdAt', 'DESC')
        .getOne();

      let nextSeq = 1;
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const numPart = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ''), 10);
        if (!isNaN(numPart) && numPart >= 1) {
          nextSeq = numPart + 1;
        }
      } else {
        const count = await queryRunner.manager
          .getRepository(FiscalInvoice)
          .createQueryBuilder('fi')
          .where('fi.tenantId = :tenantId', { tenantId: params.tenantId })
          .getCount();
        nextSeq = count + 1;
      }

      await queryRunner.commitTransaction();

      const series = 'A';
      const invoiceNumber = `FAC-${String(nextSeq).padStart(8, '0')}`;
      const fiscalControlNumber = `00-${String(nextSeq).padStart(8, '0')}`;

      // Generar código QR reglamentario SENIAT:
      // Formato: RIF|FACTURA|CONTROL|FECHA|TOTAL_BS|IVA_BS
      const dateStr = new Date().toISOString().split('T')[0];
      const issuerRif = tenantSettings?.fiscalRif || 'J-00000000-0';
      const qrPayload = `${issuerRif}|${invoiceNumber}|${fiscalControlNumber}|${dateStr}|${params.amountBs.toFixed(2)}|${params.taxAmount.toFixed(2)}`;
      const qrCodeUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(qrPayload)}`;

      return {
        success: true,
        status: FiscalInvoiceStatus.ISSUED,
        provider: this.providerType,
        invoiceNumber,
        fiscalControlNumber,
        series,
        qrCodeUrl,
        metadata: {
          generationMode: 'INTERNAL_AUTONOMOUS',
          issuerRif,
          issuerName: tenantSettings?.fiscalCompanyName || 'FinoWork Business',
          qrPayload,
          issuedAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      this.logger.error(`Error emitiendo factura interna: ${err?.message || err}`);
      return {
        success: false,
        status: FiscalInvoiceStatus.REJECTED,
        provider: this.providerType,
        invoiceNumber: '',
        rejectionReason: err?.message || 'Error interno al generar factura',
      };
    } finally {
      await queryRunner.release();
    }
  }

  async cancelInvoice(
    params: CancelFiscalInvoiceParams,
    tenantSettings: any,
  ): Promise<FiscalCancelResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`fiscal_nc_${params.tenantId}`]);

      const lastNc = await queryRunner.manager
        .getRepository(FiscalInvoice)
        .createQueryBuilder('fi')
        .where('fi.tenantId = :tenantId AND fi.documentType = :docType', {
          tenantId: params.tenantId,
          docType: FiscalDocumentType.CREDIT_NOTE,
        })
        .orderBy('fi.createdAt', 'DESC')
        .getOne();

      let nextNcSeq = 1;
      if (lastNc && lastNc.invoiceNumber) {
        const numPart = parseInt(lastNc.invoiceNumber.replace(/\D/g, ''), 10);
        if (!isNaN(numPart) && numPart >= 1) {
          nextNcSeq = numPart + 1;
        }
      } else {
        const ncCount = await queryRunner.manager
          .getRepository(FiscalInvoice)
          .createQueryBuilder('fi')
          .where('fi.tenantId = :tenantId AND fi.documentType = :docType', {
            tenantId: params.tenantId,
            docType: FiscalDocumentType.CREDIT_NOTE,
          })
          .getCount();
        nextNcSeq = ncCount + 1;
      }

      await queryRunner.commitTransaction();

      const creditNoteNumber = `NC-${String(nextNcSeq).padStart(8, '0')}`;
      const creditNoteControlNumber = `NC-00-${String(nextNcSeq).padStart(8, '0')}`;

      return {
        success: true,
        status: FiscalInvoiceStatus.ISSUED,
        creditNoteNumber,
        creditNoteControlNumber,
        metadata: {
          originalInvoiceNumber: params.originalInvoiceNumber,
          originalControlNumber: params.originalControlNumber,
          cancelReason: params.reason,
          canceledAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      return {
        success: false,
        status: FiscalInvoiceStatus.REJECTED,
        errorMessage: err?.message || 'Error anulando factura interna',
      };
    } finally {
      await queryRunner.release();
    }
  }

  async checkStatus(
    externalGuid: string,
    _tenantSettings: any,
  ): Promise<FiscalInvoiceResult> {
    return {
      success: true,
      status: FiscalInvoiceStatus.ISSUED,
      provider: this.providerType,
      invoiceNumber: externalGuid,
    };
  }
}
