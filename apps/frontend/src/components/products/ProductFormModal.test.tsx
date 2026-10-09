import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductFormModal } from './ProductFormModal';
import { SettingsContext } from '../../context/SettingsContext';
import { apiClient } from '../../api/client';

vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  }
}));

// Mock Ionic components that use shadow DOM or custom web components
vi.mock('@ionic/react', async () => {
  const actual: any = await vi.importActual('@ionic/react');
  return {
    ...actual,
    IonModal: ({ children, isOpen }: any) => isOpen ? <div data-testid="ion-modal">{children}</div> : null,
    IonHeader: ({ children }: any) => <header>{children}</header>,
    IonToolbar: ({ children }: any) => <div>{children}</div>,
    IonTitle: ({ children }: any) => <h1>{children}</h1>,
    IonButtons: ({ children }: any) => <div>{children}</div>,
    IonButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    IonContent: ({ children }: any) => <main>{children}</main>,
    IonIcon: () => <span data-testid="ion-icon" />,
    useIonToast: () => [vi.fn()],
  };
});

describe('ProductFormModal & Service Feature Flag Control Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (apiClient.get as any).mockResolvedValue({ data: [] });
  });

  const renderModalWithSettings = (settings: any, props: any = {}) => {
    const mockContextValue: any = {
      settings,
      exchangeRate: 40,
      isLoading: false,
      refreshSettings: vi.fn(),
      updateSettings: vi.fn(),
    };

    return render(
      <SettingsContext.Provider value={mockContextValue}>
        <ProductFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          product={null}
          users={[]}
          settings={settings}
          {...props}
        />
      </SettingsContext.Provider>
    );
  };

  it('NO debe mostrar opción ni pestaña de Servicios si featureCustomerSchedules/enableReservations está desactivado', async () => {
    const retailOnlySettings = {
      featureCustomerSchedules: false,
      enableReservations: false,
      featureBuySell: true,
      featureProduction: false,
      enableProduction: false,
    };

    renderModalWithSettings(retailOnlySettings);

    // No debe existir el botón/pestaña de Servicio
    expect(screen.queryByText(/Servicio/i)).toBeNull();
    expect(screen.queryByText(/💆/i)).toBeNull();

    // Debe mostrar formulario de producto
    expect(screen.getByText(/Nombre del Producto \*/i)).toBeDefined();
    expect(screen.getByText(/Datos del Producto de Reventa/i)).toBeDefined();
    expect(screen.getByText(/Nuevo Producto para Reventa/i)).toBeDefined();

    // No debe renderizar selector de arquetipos al haber un único tipo disponible (REVENTA)
    expect(screen.queryByText(/📦 Reventa Directa/i)).toBeNull();
  });

  it('NO debe mostrar la pestaña de Servicios si hay múltiples tipos de producto (Reventa + Producción) pero Servicios está inactivo', async () => {
    const retailAndProdSettings = {
      featureCustomerSchedules: false,
      enableReservations: false,
      featureBuySell: true,
      enableRetail: true,
      featureProduction: true,
      enableProduction: true,
    };

    renderModalWithSettings(retailAndProdSettings);

    // Debe mostrar pestañas para los tipos activos
    expect(screen.getByText(/📦 Reventa Directa/i)).toBeDefined();
    expect(screen.getByText(/🧪 Con Fórmula/i)).toBeDefined();

    // Pero NO debe mostrar la pestaña de Servicio
    expect(screen.queryByText(/💆 Servicio/i)).toBeNull();
    expect(screen.queryByText(/Servicio \/ Cita/i)).toBeNull();
  });

  it('Debe mostrar la pestaña de Servicios cuando featureCustomerSchedules/enableReservations está activado', async () => {
    const allActiveSettings = {
      featureCustomerSchedules: true,
      enableReservations: true,
      featureBuySell: true,
      enableRetail: true,
      featureProduction: true,
      enableProduction: true,
    };

    renderModalWithSettings(allActiveSettings);

    // Deben estar disponibles las 3 opciones
    expect(screen.getByText(/📦 Reventa Directa/i)).toBeDefined();
    expect(screen.getByText(/🧪 Con Fórmula/i)).toBeDefined();
    expect(screen.getByText(/💆 Servicio \/ Cita/i)).toBeDefined();

    // Al hacer click en Servicio, debe cambiar los campos a los de Servicio
    fireEvent.click(screen.getByText(/💆 Servicio \/ Cita/i));

    expect(screen.getByText(/Nombre del Servicio \*/i)).toBeDefined();
    expect(screen.getByText(/Duración Estimada \(Minutos\)/i)).toBeDefined();
  });

  it('Fuerza el tipo a REVENTA si se intenta pasar archetype="SERVICIO" con el módulo de servicios inactivo', async () => {
    const retailOnlySettings = {
      featureCustomerSchedules: false,
      enableReservations: false,
      featureBuySell: true,
      featureProduction: false,
    };

    renderModalWithSettings(retailOnlySettings, { archetype: 'SERVICIO' });

    // A pesar de solicitar SERVICIO, debe normalizar al único disponible (REVENTA)
    expect(screen.queryByText(/Nombre del Servicio \*/i)).toBeNull();
    expect(screen.getByText(/Nombre del Producto \*/i)).toBeDefined();
    expect(screen.getByText(/Datos del Producto de Reventa/i)).toBeDefined();
  });
});
