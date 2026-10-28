import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibroVentasModal } from './LibroVentasModal';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('@ionic/react', async () => {
  const actual: any = await vi.importActual('@ionic/react');
  return {
    ...actual,
    IonModal: ({ children, isOpen }: any) => (isOpen ? <div data-testid="libro-modal">{children}</div> : null),
    IonSpinner: () => <span data-testid="ion-spinner">Cargando...</span>,
    useIonToast: () => [vi.fn()],
  };
});

describe('LibroVentasModal - Reporte y Exportación SENIAT', () => {
  const mockReport = {
    periodo: '2026-05',
    resumen: {
      totalDocumentos: 2,
      totalVentasConIvaBs: 15000.0,
      totalExentoBs: 3000.0,
      totalBaseImponibleBs: 10344.83,
      totalIvaBs: 1655.17,
    },
    filas: [
      {
        operacionNumero: 1,
        fecha: '2026-05-02',
        rifCliente: 'V-12345678',
        nombreCliente: 'Pedro Pérez',
        tipoDocumento: '01-FAC',
        numeroFactura: 'FAC-00000001',
        numeroControl: '00-00000001',
        numeroFacturaAfectada: '',
        totalVentasConIvaBs: 10000.0,
        ventasExentasBs: 2000.0,
        baseImponibleBs: 6896.55,
        alicuotaIva: 16,
        impuestoIvaBs: 1103.45,
      },
      {
        operacionNumero: 2,
        fecha: '2026-05-15',
        rifCliente: 'J-99887766-5',
        nombreCliente: 'Comercializadora Caracas C.A.',
        tipoDocumento: '01-FAC',
        numeroFactura: 'FAC-00000002',
        numeroControl: '00-00000002',
        numeroFacturaAfectada: '',
        totalVentasConIvaBs: 5000.0,
        ventasExentasBs: 1000.0,
        baseImponibleBs: 3448.28,
        alicuotaIva: 16,
        impuestoIvaBs: 551.72,
      },
    ],
  };

  const mockSettings = {
    fiscalCompanyName: 'EMPRESA MATRIZ C.A.',
    fiscalRif: 'J-99999999-0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({ data: mockReport });
    // Mock URL.createObjectURL and URL.revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('Debe consultar /fiscal/libro-ventas al abrir el modal', async () => {
    render(<LibroVentasModal isOpen={true} onClose={vi.fn()} settings={mockSettings} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/fiscal/libro-ventas', expect.objectContaining({
        params: expect.objectContaining({
          year: expect.any(Number),
          month: expect.any(Number),
        }),
      }));
    });
  });

  it('Debe mostrar los datos del resumen mensual del SENIAT', async () => {
    render(<LibroVentasModal isOpen={true} onClose={vi.fn()} settings={mockSettings} />);

    await waitFor(() => {
      expect(screen.getByText('EMPRESA MATRIZ C.A.')).toBeDefined();
      expect(screen.getByText('J-99999999-0')).toBeDefined();
      expect(screen.getByText('FAC-00000001')).toBeDefined();
      expect(screen.getByText('FAC-00000002')).toBeDefined();
      expect(screen.getByText('Pedro Pérez')).toBeDefined();
      expect(screen.getByText('Comercializadora Caracas C.A.')).toBeDefined();
    });
  });

  it('Debe permitir filtrar facturas por texto de búsqueda', async () => {
    render(<LibroVentasModal isOpen={true} onClose={vi.fn()} settings={mockSettings} />);

    await waitFor(() => {
      expect(screen.getByText('Pedro Pérez')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Filtrar por N° Factura/i);
    fireEvent.change(searchInput, { target: { value: 'Comercializadora' } });

    expect(screen.queryByText('Pedro Pérez')).toBeNull();
    expect(screen.getByText('Comercializadora Caracas C.A.')).toBeDefined();
  });

  it('Debe disparar la descarga de Excel al hacer clic en Descargar Excel', async () => {
    render(<LibroVentasModal isOpen={true} onClose={vi.fn()} settings={mockSettings} />);

    await waitFor(() => {
      expect(screen.getByText(/Descargar Excel/i)).toBeDefined();
    });

    const excelBtn = screen.getByText(/Descargar Excel/i);
    fireEvent.click(excelBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('Debe disparar la descarga de CSV al hacer clic en Descargar CSV', async () => {
    render(<LibroVentasModal isOpen={true} onClose={vi.fn()} settings={mockSettings} />);

    await waitFor(() => {
      expect(screen.getByText(/Descargar CSV/i)).toBeDefined();
    });

    const csvBtn = screen.getByText(/Descargar CSV/i);
    fireEvent.click(csvBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
