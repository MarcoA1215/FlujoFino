import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalInvoice } from '../entities/fiscal-invoice.entity';
import { Settings } from '../entities/settings.entity';
import { Order } from '../entities/order.entity';
import { InternalFiscalProvider } from './providers/internal-fiscal.provider';
import { UnidigitalFiscalProvider } from './providers/unidigital-fiscal.provider';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import {
  FiscalDocumentType,
  FiscalInvoiceStatus,
  FiscalProviderType,
  FiscalInvoiceItemDTO,
} from '@finowork/shared-types';
import { IssueFiscalInvoiceParams } from './interfaces/fiscal-provider.interface';

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    @InjectRepository(FiscalInvoice)
    private fiscalInvoiceRepo: Repository<FiscalInvoice>,
    @InjectRepository(Settings)
    private settingsRepo: Repository<Settings>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private internalProvider: InternalFiscalProvider,
    private unidigitalProvider: UnidigitalFiscalProvider,
  ) {}

  private getProvider(fiscalMode?: string) {
    // UniDigital en pausa hasta disponer de homologación y credenciales oficiales
    if (fiscalMode === FiscalProviderType.UNIDIGITAL && process.env.ENABLE_UNIDIGITAL_GATEWAY === 'true') {
      return this.unidigitalProvider;
    }
    return this.internalProvider;
  }

  async issueInvoice(tenantId: string, dto: IssueInvoiceDto): Promise<FiscalInvoice> {
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });

    let order: Order | null = null;
    let items: FiscalInvoiceItemDTO[] = [];
    let subtotalExempt = 0;
    let taxableBase = 0;
    let taxAmount = 0;
    let totalAmount = 0;
    let exchangeRate = Number(settings?.exchangeRateBs || 40.0);

    if (dto.orderId) {
      order = await this.orderRepo.findOne({
        where: { id: dto.orderId, tenantId },
        relations: { items: { product: true } },
      });

      if (!order) {
        throw new NotFoundException(`Pedido ${dto.orderId} no encontrado`);
      }

      // Verificar si ya tiene una factura fiscal activa
      const existing = await this.fiscalInvoiceRepo.findOne({
        where: {
          tenantId,
          orderId: dto.orderId,
          documentType: FiscalDocumentType.INVOICE,
          status: FiscalInvoiceStatus.ISSUED,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `El pedido ya tiene una factura fiscal emitida: ${existing.invoiceNumber}`,
        );
      }

      exchangeRate = Number(order.exchangeRate || settings?.exchangeRateBs || 40.0);

      // Calcular montos desde los ítems de la orden
      if (order.items && order.items.length > 0) {
        for (const it of order.items) {
          const isExempt = Boolean(it.isTaxExempt || it.product?.isTaxExempt);
          const rate = isExempt
            ? 0
            : Number(it.taxRate !== undefined && it.taxRate !== null ? it.taxRate : (it.product?.taxRate || settings?.fiscalDefaultTaxRate || 16.0));
          const lineSubtotal = Number(it.subtotal || it.unitPrice * it.quantity);
          const lineTax = isExempt ? 0 : Number(((lineSubtotal * rate) / 100).toFixed(2));

          if (isExempt) {
            subtotalExempt += lineSubtotal;
          } else {
            taxableBase += lineSubtotal;
            taxAmount += lineTax;
          }

          items.push({
            productId: it.productId,
            name: it.productName || it.product?.name || 'Producto',
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            isTaxExempt: isExempt,
            taxRate: rate,
            taxAmount: lineTax,
            subtotal: lineSubtotal,
          });
        }
      } else {
        totalAmount = Number(order.totalAmount || 0);
        taxableBase = totalAmount;
        taxAmount = Number(((taxableBase * 16.0) / 100).toFixed(2));
      }

      totalAmount = subtotalExempt + taxableBase + taxAmount;
    }

    const amountBs = totalAmount * exchangeRate;
    const provider = this.getProvider(settings?.fiscalMode);

    const params: IssueFiscalInvoiceParams = {
      orderId: dto.orderId || null,
      tenantId,
      customerName: dto.customerName || order?.customerName || 'Cliente General',
      customerRif: dto.customerRif || 'V-00000000-0',
      customerAddress: dto.customerAddress || order?.customerAddress || '',
      customerPhone: dto.customerPhone || order?.customerPhone || '',
      documentType: FiscalDocumentType.INVOICE,
      items,
      subtotalExempt,
      taxableBase,
      taxRate: Number(settings?.fiscalDefaultTaxRate || 16.0),
      taxAmount,
      totalAmount,
      exchangeRate,
      amountBs,
      paymentMethod: order?.paymentMethod || 'USD',
    };

    const result = await provider.issueInvoice(params, settings);

    const fiscalInvoice = this.fiscalInvoiceRepo.create({
      tenantId,
      orderId: dto.orderId || null,
      documentType: FiscalDocumentType.INVOICE,
      provider: provider.providerType,
      status: result.status,
      invoiceNumber: result.invoiceNumber,
      fiscalControlNumber: result.fiscalControlNumber || null,
      series: result.series || 'A',
      customerName: params.customerName,
      customerRif: params.customerRif,
      customerAddress: params.customerAddress,
      customerPhone: params.customerPhone,
      subtotalExempt,
      taxableBase,
      taxRate: params.taxRate,
      taxAmount,
      totalAmount,
      amountBs,
      exchangeRate,
      externalGuid: result.externalGuid || null,
      qrCodeUrl: result.qrCodeUrl || null,
      pdfUrl: result.pdfUrl || null,
      rejectionReason: result.rejectionReason || null,
      items,
      metadata: result.metadata || null,
    } as Partial<FiscalInvoice>);

    const savedInvoice = await this.fiscalInvoiceRepo.save(fiscalInvoice);

    // Actualizar la orden comercial si existe
    if (order) {
      order.fiscalInvoiceId = savedInvoice.id;
      order.fiscalStatus = savedInvoice.status;
      order.subtotalExempt = subtotalExempt;
      order.taxableBase = taxableBase;
      order.taxAmount = taxAmount;
      await this.orderRepo.save(order);
    }

    return savedInvoice;
  }

  async findAll(tenantId: string, limit: number = 50, page: number = 1): Promise<{ data: FiscalInvoice[]; total: number }> {
    const [data, total] = await this.fiscalInvoiceRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
      skip: (Math.max(1, page) - 1) * limit,
    });

    return { data, total };
  }

  async findOne(tenantId: string, id: string): Promise<FiscalInvoice> {
    const invoice = await this.fiscalInvoiceRepo.findOne({
      where: { id, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura fiscal ${id} no encontrada`);
    }
    return invoice;
  }

  async cancelInvoice(tenantId: string, id: string, dto: CancelInvoiceDto): Promise<{ canceledInvoice: FiscalInvoice; creditNote: FiscalInvoice }> {
    const invoice = await this.findOne(tenantId, id);

    if (invoice.status === FiscalInvoiceStatus.CANCELED) {
      throw new BadRequestException('Esta factura ya fue anulada previamente');
    }

    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    const provider = this.getProvider(invoice.provider);

    const cancelResult = await provider.cancelInvoice(
      {
        invoiceId: invoice.id,
        tenantId,
        reason: dto.reason,
        originalInvoiceNumber: invoice.invoiceNumber,
        originalControlNumber: invoice.fiscalControlNumber || undefined,
        originalExternalGuid: invoice.externalGuid || undefined,
      },
      settings,
    );

    // 1. Marcar la factura original como CANCELED
    invoice.status = FiscalInvoiceStatus.CANCELED;
    invoice.rejectionReason = `Anulada: ${dto.reason}`;
    await this.fiscalInvoiceRepo.save(invoice);

    // 2. Crear la Nota de Crédito fiscal reglamentaria
    const creditNote = this.fiscalInvoiceRepo.create({
      tenantId,
      orderId: invoice.orderId,
      documentType: FiscalDocumentType.CREDIT_NOTE,
      provider: invoice.provider,
      status: FiscalInvoiceStatus.ISSUED,
      invoiceNumber: cancelResult.creditNoteNumber || `NC-${invoice.invoiceNumber}`,
      fiscalControlNumber: cancelResult.creditNoteControlNumber || null,
      series: invoice.series,
      customerName: invoice.customerName,
      customerRif: invoice.customerRif,
      customerAddress: invoice.customerAddress,
      customerPhone: invoice.customerPhone,
      subtotalExempt: -Math.abs(invoice.subtotalExempt),
      taxableBase: -Math.abs(invoice.taxableBase),
      taxRate: invoice.taxRate,
      taxAmount: -Math.abs(invoice.taxAmount),
      totalAmount: -Math.abs(invoice.totalAmount),
      amountBs: -Math.abs(invoice.amountBs),
      exchangeRate: invoice.exchangeRate,
      externalGuid: cancelResult.externalGuid || null,
      pdfUrl: cancelResult.pdfUrl || null,
      qrCodeUrl: cancelResult.qrCodeUrl || null,
      items: invoice.items,
      metadata: {
        affectedInvoiceId: invoice.id,
        affectedInvoiceNumber: invoice.invoiceNumber,
        reason: dto.reason,
      },
    } as Partial<FiscalInvoice>);

    const savedCreditNote = await this.fiscalInvoiceRepo.save(creditNote);

    // 3. Actualizar la orden comercial vinculada
    if (invoice.orderId) {
      const order = await this.orderRepo.findOne({ where: { id: invoice.orderId, tenantId } });
      if (order) {
        order.fiscalStatus = FiscalInvoiceStatus.CANCELED;
        await this.orderRepo.save(order);
      }
    }

    return { canceledInvoice: invoice, creditNote: savedCreditNote };
  }

  async getLibroVentas(tenantId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const invoices = await this.fiscalInvoiceRepo
      .createQueryBuilder('fi')
      .where('fi.tenantId = :tenantId', { tenantId })
      .andWhere('fi.createdAt >= :startDate AND fi.createdAt <= :endDate', { startDate, endDate })
      .orderBy('fi.createdAt', 'ASC')
      .getMany();

    let totalVentasConIvaBs = 0;
    let totalExentoBs = 0;
    let totalBaseImponibleBs = 0;
    let totalIvaBs = 0;

    const rows = invoices.map((inv, idx) => {
      const isCreditNote = inv.documentType === FiscalDocumentType.CREDIT_NOTE;
      const multiplier = isCreditNote ? -1 : 1;

      const rowTotalBs = Math.abs(Number(inv.amountBs)) * multiplier;
      const rowExemptBs = Math.abs(Number(inv.subtotalExempt * inv.exchangeRate)) * multiplier;
      const rowBaseBs = Math.abs(Number(inv.taxableBase * inv.exchangeRate)) * multiplier;
      const rowTaxBs = Math.abs(Number(inv.taxAmount * inv.exchangeRate)) * multiplier;

      totalVentasConIvaBs += rowTotalBs;
      totalExentoBs += rowExemptBs;
      totalBaseImponibleBs += rowBaseBs;
      totalIvaBs += rowTaxBs;

      return {
        operacionNumero: idx + 1,
        fecha: inv.createdAt.toISOString().split('T')[0],
        rifCliente: inv.customerRif,
        nombreCliente: inv.customerName,
        tipoDocumento: isCreditNote ? '02-NC' : '01-FAC',
        numeroFactura: inv.invoiceNumber,
        numeroControl: inv.fiscalControlNumber || 'S/N',
        numeroFacturaAfectada: (inv.metadata as any)?.affectedInvoiceNumber || '',
        totalVentasConIvaBs: rowTotalBs,
        ventasExentasBs: rowExemptBs,
        baseImponibleBs: rowBaseBs,
        alicuotaIva: inv.taxRate,
        impuestoIvaBs: rowTaxBs,
      };
    });

    return {
      periodo: `${year}-${String(month).padStart(2, '0')}`,
      resumen: {
        totalDocumentos: invoices.length,
        totalVentasConIvaBs,
        totalExentoBs,
        totalBaseImponibleBs,
        totalIvaBs,
      },
      filas: rows,
    };
  }
}
