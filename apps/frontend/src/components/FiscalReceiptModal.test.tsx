import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FiscalReceiptModal } from './FiscalReceiptModal';
import { FiscalDocumentType, FiscalInvoiceStatus, FiscalProviderType } from '@finowork/shared-types';

vi.mock('@ionic/react', async () => {
  const actual: any = await vi.importActual('@ionic/react');
  return {
    ...actual,
    IonModal: ({ children, isOpen }: any) => (isOpen ? <div data-testid="fiscal-modal">{children}</div> : null),
    useIonToast: () => [vi.fn()],
  };
});

describe('FiscalReceiptModal - Comprobante Fiscal SENIAT', () => {
  const mockInvoice: any = {
    id: 'fisc_123',
    tenantId: 'tenant_1',
    documentType: FiscalDocumentType.INVOICE,
    provider: FiscalProviderType.INTERNAL,
    status: FiscalInvoiceStatus.ISSUED,
    invoiceNumber: 'FAC-00000042',
    fiscalControlNumber: '00-00000042',
    series: 'A',
    customerName: 'Distribuidora Los Andes C.A.',
    customerRif: 'J-30123456-7',
    customerAddress: 'Av. Libertador, Edif. Torre Real, Caracas',
    customerPhone: '0414-9876543',
    subtotalExempt: 50.00,
    taxableBase: 100.00,
    taxRate: 16.00,
    taxAmount: 16.00,
    totalAmount: 166.00,
    exchangeRate: 40.00,
    amountBs: 6640.00,
    qrCodeUrl: 'https://seniat.gob.ve/qr/FAC-00000042',
    createdAt: new Date('2026-05-10T14:30:00Z').toISOString(),
    items: [
      { name: 'Harina PAN 1kg (Exento)', quantity: 10, unitPrice: 5.0, subtotal: 50.0, isExempt: true },
      { name: 'Bebida Energética 500ml', quantity: 20, unitPrice: 5.0, subtotal: 100.0, isExempt: false },
    ],
  };

  const mockSettings = {
    fiscalCompanyName: 'SUPERMERCADO CENTRAL C.A.',
    fiscalRif: 'J-12345678-9',
    fiscalAddress: 'Caracas, Venezuela',
    fiscalPhone: '0212-5550000',
    exchangeRateBs: 40.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('No debe renderizar nada si invoice es null', () => {
    const { container } = render(
      <FiscalReceiptModal isOpen={true} onClose={vi.fn()} invoice={null} settings={mockSettings} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('Debe renderizar los datos de la empresa y del documento fiscal', () => {
    render(
      <FiscalReceiptModal isOpen={true} onClose={vi.fn()} invoice={mockInvoice} settings={mockSettings} />
    );

    expect(screen.getByText(/SUPERMERCADO CENTRAL C\.A\./i)).toBeDefined();
    expect(screen.getByText(/RIF: J-12345678-9/i)).toBeDefined();
    expect(screen.getByText('FAC-00000042')).toBeDefined();
    expect(screen.getByText('00-00000042')).toBeDefined();
    expect(screen.getByText(/Distribuidora Los Andes C\.A\./i)).toBeDefined();
    expect(screen.getByText('J-30123456-7')).toBeDefined();
  });

  it('Debe mostrar el desglose tributario exacto en USD y Bs', () => {
    render(
      <FiscalReceiptModal isOpen={true} onClose={vi.fn()} invoice={mockInvoice} settings={mockSettings} />
    );

    // Exento: $50.00 USD -> Bs. 2000.00
    expect(screen.getByText(/SUBTOTAL EXENTO \(E\):/i)).toBeDefined();
    expect(screen.getByText(/\$50\.00 \(Bs\. 2000\.00\)/i)).toBeDefined();

    // Base imponible: $100.00 USD -> Bs. 4000.00
    expect(screen.getByText(/BASE IMPONIBLE \(G 16%\):/i)).toBeDefined();
    expect(screen.getByText(/\$100\.00 \(Bs\. 4000\.00\)/i)).toBeDefined();

    // IVA 16%: $16.00 USD -> Bs. 640.00
    expect(screen.getByText(/TOTAL IVA \(16%\):/i)).toBeDefined();
    expect(screen.getByText(/\$16\.00 \(Bs\. 640\.00\)/i)).toBeDefined();

    // Total a pagar: $166.00 USD / Bs. 6640.00
    expect(screen.getByText(/\$166\.00 USD/i)).toBeDefined();
    expect(screen.getByText(/Bs\. 6640\.00/i)).toBeDefined();
  });

  it('Debe permitir copiar el resumen en el portapapeles', () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    render(
      <FiscalReceiptModal isOpen={true} onClose={vi.fn()} invoice={mockInvoice} settings={mockSettings} />
    );

    const copyBtn = screen.getByText(/Copiar Detalle/i);
    fireEvent.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalled();
    expect(writeTextSpy.mock.calls[0][0]).toContain('TICKET DE VENTA Y ENTREGA');
    expect(writeTextSpy.mock.calls[0][0]).toContain('NO VÁLIDO COMO FACTURA FISCAL');
    expect(writeTextSpy.mock.calls[0][0]).toContain('FAC-00000042');
  });

  it('Debe ejecutar window.print() al hacer clic en Imprimir Comprobante', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <FiscalReceiptModal isOpen={true} onClose={vi.fn()} invoice={mockInvoice} settings={mockSettings} />
    );

    const printBtn = screen.getByText(/Imprimir Comprobante/i);
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
  });
});
