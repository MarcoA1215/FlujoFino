import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FiscalService } from './fiscal.service';
import { FiscalInvoice } from '../entities/fiscal-invoice.entity';
import { Settings } from '../entities/settings.entity';
import { Order } from '../entities/order.entity';
import { InternalFiscalProvider } from './providers/internal-fiscal.provider';
import { UnidigitalFiscalProvider } from './providers/unidigital-fiscal.provider';
import { FiscalDocumentType, FiscalInvoiceStatus, FiscalProviderType } from '@finowork/shared-types';

describe('FiscalService - Suite de Arquitectura Desacoplada (Fase 2)', () => {
  let service: FiscalService;
  let fiscalInvoiceRepo: any;
  let settingsRepo: any;
  let orderRepo: any;
  let internalProvider: any;
  let unidigitalProvider: any;

  beforeEach(async () => {
    fiscalInvoiceRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'mock-fiscal-id', ...dto })),
      save: jest.fn().mockImplementation(async (inv) => ({ id: 'mock-fiscal-id', ...inv })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn(),
    };

    settingsRepo = {
      findOne: jest.fn().mockResolvedValue({
        tenantId: 'tenant-123',
        featureFiscalSupport: true,
        fiscalDefaultTaxRate: 16.0,
        fiscalMode: FiscalProviderType.INTERNAL,
        fiscalRif: 'J-12345678-9',
        fiscalCompanyName: 'Empresa Test C.A.',
        exchangeRateBs: 40.0,
      }),
    };

    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (ord) => ord),
    };

    internalProvider = {
      providerType: FiscalProviderType.INTERNAL,
      issueInvoice: jest.fn().mockResolvedValue({
        success: true,
        status: FiscalInvoiceStatus.ISSUED,
        provider: FiscalProviderType.INTERNAL,
        invoiceNumber: 'FAC-00000001',
        fiscalControlNumber: '00-00000001',
        series: 'A',
        qrCodeUrl: 'data:text/plain,J-12345678-9|FAC-00000001',
      }),
      cancelInvoice: jest.fn().mockResolvedValue({
        success: true,
        status: FiscalInvoiceStatus.ISSUED,
        creditNoteNumber: 'NC-00000001',
        creditNoteControlNumber: 'NC-00-00000001',
      }),
      checkStatus: jest.fn(),
    };

    unidigitalProvider = {
      providerType: FiscalProviderType.UNIDIGITAL,
      issueInvoice: jest.fn(),
      cancelInvoice: jest.fn(),
      checkStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalService,
        { provide: getRepositoryToken(FiscalInvoice), useValue: fiscalInvoiceRepo },
        { provide: getRepositoryToken(Settings), useValue: settingsRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: InternalFiscalProvider, useValue: internalProvider },
        { provide: UnidigitalFiscalProvider, useValue: unidigitalProvider },
      ],
    }).compile();

    service = module.get<FiscalService>(FiscalService);
  });

  it('Debe instanciarse correctamente', () => {
    expect(service).toBeDefined();
  });

  it('Debe emitir factura fiscal interna calculando bases imponibles, IVA y Bs al cambio oficial', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-123',
      customerName: 'Juan Perez',
      customerPhone: '0414-1111111',
      customerAddress: 'Caracas',
      paymentMethod: 'PAGO_MOVIL',
      exchangeRate: 40.0,
      totalAmount: 116.0,
      items: [
        {
          productId: 'prod-1',
          productName: 'Harina Pan',
          quantity: 2,
          unitPrice: 10.0,
          isTaxExempt: true,
          taxRate: 0,
          subtotal: 20.0,
        },
        {
          productId: 'prod-2',
          productName: 'Refresco',
          quantity: 1,
          unitPrice: 10.0,
          isTaxExempt: false,
          taxRate: 16.0,
          subtotal: 10.0,
        },
      ],
    });

    const result = await service.issueInvoice('tenant-123', {
      orderId: 'order-1',
      customerName: 'Juan Perez',
      customerRif: 'V-12345678',
    });

    expect(result).toBeDefined();
    expect(internalProvider.issueInvoice).toHaveBeenCalled();
    expect(fiscalInvoiceRepo.save).toHaveBeenCalled();
    expect(orderRepo.save).toHaveBeenCalled();

    // Verificación de cálculos fiscales SENIAT:
    // Exento: 2 * 10 = $20.00
    // Gravable: 1 * 10 = $10.00
    // IVA 16%: $1.60
    // Total USD: $31.60
    // Total Bs a 40: 31.60 * 40 = 1264 Bs.
    expect(result.subtotalExempt).toBe(20.0);
    expect(result.taxableBase).toBe(10.0);
    expect(result.taxAmount).toBe(1.6);
    expect(result.totalAmount).toBe(31.6);
    expect(result.amountBs).toBe(1264.0);
    expect(result.invoiceNumber).toBe('FAC-00000001');
  });

  it('Debe anular una factura y generar la Nota de Crédito fiscal reglamentaria', async () => {
    fiscalInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-to-cancel',
      tenantId: 'tenant-123',
      orderId: 'order-1',
      provider: FiscalProviderType.INTERNAL,
      status: FiscalInvoiceStatus.ISSUED,
      invoiceNumber: 'FAC-00000001',
      fiscalControlNumber: '00-00000001',
      series: 'A',
      customerName: 'Juan Perez',
      customerRif: 'V-12345678',
      subtotalExempt: 20.0,
      taxableBase: 10.0,
      taxRate: 16.0,
      taxAmount: 1.6,
      totalAmount: 31.6,
      amountBs: 1264.0,
      exchangeRate: 40.0,
      items: [],
    });

    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-123',
      fiscalStatus: FiscalInvoiceStatus.ISSUED,
    });

    const { canceledInvoice, creditNote } = await service.cancelInvoice('tenant-123', 'inv-to-cancel', {
      reason: 'Error en digitación de pedido',
    });

    expect(canceledInvoice.status).toBe(FiscalInvoiceStatus.CANCELED);
    expect(creditNote).toBeDefined();
    expect(creditNote.documentType).toBe(FiscalDocumentType.CREDIT_NOTE);
    expect(creditNote.totalAmount).toBe(-31.6);
    expect(creditNote.amountBs).toBe(-1264.0);
  });
});
