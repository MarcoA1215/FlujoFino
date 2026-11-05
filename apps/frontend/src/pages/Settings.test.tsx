import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './Settings';
import { AuthContext } from '../context/AuthContext';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { UserRole, TenantPlanType, TenantStatus } from '@finowork/shared-types';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../services/push-notification.service', () => ({
  getNotificationPermission: vi.fn(() => 'granted'),
  checkNotificationPermissionAsync: vi.fn().mockResolvedValue('granted'),
  registerPushNotifications: vi.fn(),
  testPushNotification: vi.fn(),
  playNotificationSound: vi.fn(),
}));

vi.mock('../context/AppUpdateContext', () => ({
  useAppUpdater: () => ({
    isOpen: false,
    setIsOpen: vi.fn(),
    updateAvailable: false,
    latestUpdate: null,
    currentVersion: '1.0.0',
    currentVersionCode: 1,
    isMandatoryNow: false,
    daysRemainingInGrace: null,
    isChecking: false,
    checkForUpdates: vi.fn(),
    snoozeUpdate: vi.fn(),
    triggerDownload: vi.fn(),
  }),
}));

const mockAdminUser = {
  id: 'u-1',
  username: 'admin@glow.com',
  email: 'admin@glow.com',
  role: UserRole.ADMIN,
  tenantId: 'tenant-1',
  tenantName: 'Centro Estético Glow',
  workspaces: [{ tenantId: 'tenant-1', name: 'Centro Estético Glow', role: UserRole.ADMIN }],
};

const mockSubscriptionData = {
  tenantId: 'tenant-1',
  businessName: 'Centro Estético Glow',
  status: TenantStatus.ACTIVE,
  planType: TenantPlanType.REGULAR,
  referralCode: 'GLOW2026',
  activeReferrals: 1,
  discountPercentage: 10,
  baseFee: 20,
  finalFee: 20.88,
  trialDaysLeft: 0,
};

describe('SettingsPage - Menú Desplegable, Suscripción y Persistencia de Payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/settings');

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/settings') {
        return Promise.resolve({
          data: {
            businessName: 'Centro Estético Glow',
            exchangeRateMode: 'BCV',
            exchangeRateBs: 889.26,
            companyBank: '0134 - Banesco',
            companyCedula: 'J-12345678-0',
            companyPhone: '04141234567',
            companyAccountNumber: '01340000001234567890',
            companyAccountHolder: 'Glow C.A.',
            acceptPagoMovil: true,
            acceptTransfer: true,
            featureCustomerSchedules: true,
            featureBuySell: true,
            featureFiscalSupport: true,
            fiscalRif: 'J-12345678-0',
            fiscalCompanyName: 'Glow C.A.',
          },
        });
      }
      if (url === '/superadmin/my-subscription') {
        return Promise.resolve({ data: mockSubscriptionData });
      }
      if (url === '/settings/exchange-rate') {
        return Promise.resolve({ data: { exchangeRateBs: 889.26 } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  const renderSettings = () =>
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthContext.Provider
          value={{
            user: mockAdminUser as any,
            token: 'fake-jwt',
            login: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
            switchWorkspace: vi.fn(),
            switchMode: vi.fn(),
            isAuthenticated: true,
            isLoading: false,
          }}
        >
          <SubscriptionContext.Provider
            value={{
              subscription: mockSubscriptionData as any,
              platformConfig: null,
              exchangeRate: 889.26,
              isLoading: false,
              isExpired: false,
              daysLeft: 30,
              isReportModalOpen: false,
              setIsReportModalOpen: vi.fn(),
              refreshSubscription: vi.fn(),
            }}
          >
            <SettingsPage />
          </SubscriptionContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );

  it('muestra la tarjeta de Suscripción y Referidos arriba y los encabezados desplegables', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/Programa de Referidos/i)).toBeTruthy();
    });

    expect(screen.getByText('GLOW2026')).toBeTruthy();
    expect(screen.getByText('$20.88')).toBeTruthy();
    expect(screen.getByText(/Reportar Pago \(Mensual o Anual\)/i)).toBeTruthy();

    // Verifica que existan las categorías desplegables
    expect(screen.getByTestId('settings-section-general')).toBeTruthy();
    expect(screen.getByTestId('settings-section-payments')).toBeTruthy();
    expect(screen.getByTestId('settings-section-modules')).toBeTruthy();
    expect(screen.getByTestId('settings-section-booking')).toBeTruthy();
    expect(screen.getByTestId('settings-section-plan')).toBeTruthy();
  });

  it('permite desplegar y contraer secciones y envía el payload completo a PUT /settings sin perder datos bancarios', async () => {
    (apiClient.put as any).mockResolvedValue({ data: { businessName: 'Centro Estético Glow' } });
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: vi.fn(), search: '' },
      writable: true,
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByTestId('settings-section-general')).toBeTruthy();
    });

    // Abrir sección general y luego pagos
    fireEvent.click(screen.getByTestId('settings-section-general'));
    fireEvent.click(screen.getByTestId('settings-section-payments'));

    // Guardar cambios desde el botón superior
    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/settings',
        expect.objectContaining({
          businessName: 'Centro Estético Glow',
          companyBank: '0134 - Banesco',
          companyCedula: 'J-12345678-0',
          companyPhone: '04141234567',
          companyAccountNumber: '01340000001234567890',
          companyAccountHolder: 'Glow C.A.',
          featureFiscalSupport: true,
        })
      );
    });
  });
});
