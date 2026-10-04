import React, { useState, useEffect, useContext } from 'react';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  useIonToast
} from '@ionic/react';
import {
  cloudDoneOutline,
  cloudOfflineOutline,
  walletOutline,
  syncOutline,
  refreshOutline,
  closeOutline
} from 'ionicons/icons';
import { AuthContext } from '../context/AuthContext';
import { UserRole, APP_NAME } from '@finowork/shared-types';
import { apiClient } from '../api/client';
import { offlineDb } from '../services/offline-db';
import { DailyCashCloseModal } from './DailyCashCloseModal';
import { EmailVerificationModal } from './EmailVerificationModal';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showRate?: boolean;
  showOfflineToggle?: boolean;
  showCashClose?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = APP_NAME,
  subtitle,
  showRate = true,
  showOfflineToggle = true,
  showCashClose = true,
  onRefresh,
  children
}) => {
  const { user } = useContext(AuthContext);
  const [presentToast] = useIonToast();

  const isAdmin =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SUPERADMIN ||
    (user?.role as string) === 'ADMIN' ||
    (user?.role as string) === 'SUPERADMIN';

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(() => localStorage.getItem('flujofino_simulating_offline') === 'true');
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showCashCloseModal, setShowCashCloseModal] = useState<boolean>(false);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [showRateModal, setShowRateModal] = useState<boolean>(false);

  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    } catch (e) {}
    return 40.0;
  });

  const [exchangeRateMode, setExchangeRateMode] = useState<string>(() => {
    try {
      return localStorage.getItem('flujofino_rate_mode') || 'BCV';
    } catch {
      return 'BCV';
    }
  });

  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    try {
      return localStorage.getItem('flujofino_currency_symbol') || 'Bs.';
    } catch {
      return 'Bs.';
    }
  });

  const [availableRates, setAvailableRates] = useState<any>(null);
  const [manualInputRate, setManualInputRate] = useState<string>('');

  const refreshPendingCount = async () => {
    try {
      const count = await offlineDb.offlineOrders.count();
      setPendingOfflineCount(count);
    } catch (err) {
      console.error('Error counting offline orders:', err);
    }
  };

  const fetchRate = async () => {
    try {
      const res = await apiClient.get<any>('/settings');
      if (res.data) {
        const rate = Number(res.data.exchangeRateBs || 40.0);
        const mode = res.data.exchangeRateMode || 'BCV';
        const symbol = res.data.currencySymbol || (mode === 'COP' ? 'COP' : (mode === 'EUR' ? '€' : 'Bs.'));
        setExchangeRate(rate);
        setExchangeRateMode(mode);
        setCurrencySymbol(symbol);
        setAvailableRates(res.data.availableRates || null);
        if (res.data.manualExchangeRate) setManualInputRate(res.data.manualExchangeRate.toString());
        else setManualInputRate(rate.toString());

        localStorage.setItem('flujofino_exchange_rate', rate.toString());
        localStorage.setItem('flujofino_rate_mode', mode);
        localStorage.setItem('flujofino_currency_symbol', symbol);
      }
    } catch (e) {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && Number(saved) > 0) setExchangeRate(Number(saved));
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleSettingsUpdated = (e: any) => {
      const s = e.detail;
      if (s) {
        if (s.exchangeRateBs) setExchangeRate(Number(s.exchangeRateBs));
        if (s.exchangeRateMode) setExchangeRateMode(s.exchangeRateMode);
        if (s.currencySymbol) setCurrencySymbol(s.currencySymbol);
        if (s.availableRates) setAvailableRates(s.availableRates);
        if (s.manualExchangeRate) setManualInputRate(s.manualExchangeRate.toString());
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('settings_updated', handleSettingsUpdated);

    refreshPendingCount();
    fetchRate();

    const interval = setInterval(refreshPendingCount, 6000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('settings_updated', handleSettingsUpdated);
      clearInterval(interval);
    };
  }, []);

  const toggleOfflineSimulation = async () => {
    const nextVal = !isSimulatingOffline;
    setIsSimulatingOffline(nextVal);
    if (nextVal) {
      localStorage.setItem('flujofino_simulating_offline', 'true');
      presentToast({
        message: '⚡ Modo offline simulado activado para pruebas locales',
        duration: 2500,
        color: 'warning'
      });
    } else {
      localStorage.removeItem('flujofino_simulating_offline');
      presentToast({
        message: '🟢 Modo en línea activo: Conexión normal restaurada',
        duration: 2500,
        color: 'success'
      });
      if (navigator.onLine) {
        syncPendingOrders();
      }
    }
  };

  const syncPendingOrders = async () => {
    if (isSimulatingOffline || !navigator.onLine) {
      presentToast({ message: 'No hay conexión a internet activa', duration: 2500, color: 'warning' });
      return;
    }
    try {
      const pending = await offlineDb.offlineOrders.toArray();
      if (!pending || pending.length === 0) {
        setPendingOfflineCount(0);
        presentToast({ message: 'No hay ventas pendientes por sincronizar', duration: 2000, color: 'light' });
        return;
      }
      setIsSyncing(true);

      const response = await apiClient.post('/orders/sync-offline', { orders: pending });
      const syncedIds: string[] = response.data?.syncedOfflineIds || [];

      if (syncedIds.length > 0) {
        await offlineDb.offlineOrders.bulkDelete(syncedIds);
        await refreshPendingCount();
        presentToast({
          message: `✓ ${syncedIds.length} venta(s) sincronizada(s) con éxito con el servidor`,
          duration: 3000,
          color: 'success'
        });
        if (onRefresh) onRefresh();
      } else {
        presentToast({ message: 'No se procesaron ventas para sincronizar', duration: 2500, color: 'medium' });
      }
    } catch (err: any) {
      console.error('Error sincronizando órdenes offline:', err);
      presentToast({
        message: 'Error al sincronizar con el servidor: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplyRateMode = async (mode: string, customRate?: number) => {
    if (!isAdmin) {
      presentToast({
        message: '🔒 Solo un administrador puede modificar la tasa del negocio',
        duration: 2500,
        color: 'warning'
      });
      return;
    }

    try {
      let targetRate = exchangeRate;
      let targetSymbol = mode === 'EUR' ? '€' : 'Bs.';
      const payload: any = {
        mode,
        currencySymbol: targetSymbol,
      };

      if (mode === 'MANUAL') {
        const parsed = customRate ?? parseFloat(manualInputRate);
        if (!parsed || parsed <= 0) {
          presentToast({ message: 'Ingresa un valor numérico válido mayor a cero', duration: 2500, color: 'warning' });
          return;
        }
        payload.manualRate = parsed;
        payload.rate = parsed;
        targetRate = parsed;
      } else if (mode === 'BCV') {
        targetRate = Number(availableRates?.bcv || exchangeRate);
      } else if (mode === 'PARALELO') {
        targetRate = Number(availableRates?.parallel || availableRates?.bcv || exchangeRate);
      } else if (mode === 'USDT') {
        targetRate = Number(availableRates?.usdt || availableRates?.parallel || exchangeRate);
      } else if (mode === 'EUR') {
        targetRate = Number(availableRates?.eur || 40.0);
      }

      await apiClient.put('/settings/exchange-rate', payload);

      setExchangeRate(targetRate);
      setExchangeRateMode(mode);
      setCurrencySymbol(targetSymbol);

      localStorage.setItem('flujofino_exchange_rate', targetRate.toString());
      localStorage.setItem('flujofino_rate_mode', mode);
      localStorage.setItem('flujofino_currency_symbol', targetSymbol);

      try {
        const cached = localStorage.getItem('flujofino_cached_settings');
        const parsedCached = cached ? JSON.parse(cached) : {};
        parsedCached.exchangeRateBs = targetRate;
        parsedCached.exchangeRateMode = mode;
        parsedCached.currencySymbol = targetSymbol;
        if (mode === 'MANUAL') parsedCached.manualExchangeRate = targetRate;
        localStorage.setItem('flujofino_cached_settings', JSON.stringify(parsedCached));
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent('settings_updated', {
          detail: {
            exchangeRateBs: targetRate,
            exchangeRateMode: mode,
            currencySymbol: targetSymbol,
            manualExchangeRate: mode === 'MANUAL' ? targetRate : undefined,
            availableRates,
          },
        })
      );

      presentToast({
        message: `✓ Tasa cambiada a ${mode}: ${targetSymbol} ${mode === 'COP' ? Number(targetRate).toLocaleString('es-CO') : targetRate.toFixed(2)}`,
        duration: 2500,
        color: 'success',
      });
      setShowRateModal(false);
    } catch (e: any) {
      console.error(e);
      presentToast({ message: 'Error al cambiar la tasa', duration: 3000, color: 'danger' });
    }
  };

  const getRatePillText = () => {
    const symbol = currencySymbol || (exchangeRateMode === 'COP' ? 'COP' : 'Bs.');
    const formattedVal =
      exchangeRateMode === 'COP'
        ? Number(exchangeRate).toLocaleString('es-CO')
        : exchangeRate.toFixed(2);

    switch (exchangeRateMode) {
      case 'BCV':
        return `BCV: ${symbol} ${formattedVal}`;
      case 'PARALELO':
        return `Paralelo: ${symbol} ${formattedVal}`;
      case 'USDT':
        return `USDT: ${symbol} ${formattedVal}`;
      case 'EUR':
        return `EUR: € ${formattedVal}`;
      case 'COP':
        return `COP: ${formattedVal}`;
      case 'MANUAL':
        return `Manual: ${symbol} ${formattedVal}`;
      default:
        return `BCV: ${symbol} ${formattedVal}`;
    }
  };

  const isDisconnected = !isOnline || isSimulatingOffline;

  const canViewCashClose =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.POS ||
    user?.role === UserRole.SUPERADMIN ||
    (user?.role as string) === 'ADMIN' ||
    (user?.role as string) === 'POS' ||
    (user?.role as string) === 'SUPERADMIN';

  return (
    <>
      <IonHeader className="ion-no-border">
        <IonToolbar className="ff-header-toolbar" style={{ '--background': 'var(--theme-header, #ffffff)', borderBottom: '1px solid #E2E8F0', padding: '0 4px' } as any}>
          <IonButtons slot="start">
            <IonMenuButton color="dark" />
          </IonButtons>

          <IonTitle style={{ padding: '0 6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.3px' }}>
                {title}
              </span>
              {subtitle && (
                <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748B', marginTop: '-2px' }}>
                  {subtitle}
                </span>
              )}
            </div>
          </IonTitle>

          <IonButtons slot="end" style={{ gap: '6px', display: 'flex', alignItems: 'center' }}>
            {/* Status Pill (Interactive toggle for simulation) */}
            {showOfflineToggle && (
              <div
                className={`ff-pill ff-pill-interactive ${isDisconnected ? 'ff-pill-offline' : 'ff-pill-online'}`}
                onClick={toggleOfflineSimulation}
                title={isDisconnected ? 'Modo Offline (Toca para reconectar)' : 'En línea (Toca para simular offline)'}
              >
                <span
                  className="ff-pill-dot"
                  style={{ background: isDisconnected ? '#F97316' : '#10B981' }}
                />
                <IonIcon icon={isDisconnected ? cloudOfflineOutline : cloudDoneOutline} style={{ fontSize: '13px' }} />
                <span>{isDisconnected ? (isSimulatingOffline ? 'Offline Sim' : 'Offline') : 'En línea'}</span>
              </div>
            )}

            {/* Sync Pill - Shown conditionally if pending items exist */}
            {pendingOfflineCount > 0 && (
              <div
                className="ff-pill ff-pill-interactive ff-pill-sync"
                onClick={syncPendingOrders}
                title="Sincronizar ventas con el servidor"
              >
                {isSyncing ? (
                  <IonSpinner name="crescent" style={{ width: '12px', height: '12px' }} />
                ) : (
                  <IonIcon icon={syncOutline} style={{ fontSize: '13px' }} />
                )}
                <span>📦 {pendingOfflineCount} Sinc.</span>
              </div>
            )}

            {/* Rate Pill */}
            {showRate && (
              <div
                className={`ff-pill ${isAdmin ? 'ff-pill-interactive' : ''} ff-pill-rate`}
                onClick={() => {
                  if (isAdmin) {
                    setShowRateModal(true);
                  } else {
                    presentToast({
                      message: '🔒 Solo un administrador puede modificar la tasa del negocio',
                      duration: 2500,
                      color: 'warning',
                    });
                  }
                }}
                title={
                  isAdmin
                    ? 'Tasa de cambio actual (Clic para cambiar de modo)'
                    : 'Tasa de facturación activa del negocio (Solo administradores)'
                }
                style={{ cursor: isAdmin ? 'pointer' : 'default', userSelect: 'none' }}
              >
                <span>{getRatePillText()}</span>
              </div>
            )}

            {/* Cash Close Button */}
            {showCashClose && canViewCashClose && (
              <IonButton
                fill="clear"
                color="dark"
                onClick={() => setShowCashCloseModal(true)}
                title="Cierre de caja / Arqueo diario"
                style={{ '--padding-start': '6px', '--padding-end': '6px', height: '36px' }}
              >
                <IonIcon icon={walletOutline} style={{ fontSize: '20px' }} />
              </IonButton>
            )}

            {/* Optional Refresh */}
            {onRefresh && (
              <IonButton
                fill="clear"
                color="medium"
                onClick={onRefresh}
                title="Recargar"
                style={{ '--padding-start': '4px', '--padding-end': '4px', height: '36px' }}
              >
                <IonIcon icon={refreshOutline} style={{ fontSize: '18px' }} />
              </IonButton>
            )}

            {children}
          </IonButtons>
        </IonToolbar>

        {user && !user.isEmailVerified && (
          <div
            style={{
              background: '#fffbeb',
              borderBottom: '1px solid #fef3c7',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#b45309',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span style={{ fontWeight: '600' }}>Correo no verificado</span>
            </div>
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#b45309',
                fontWeight: '700',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '3px 10px',
                transition: 'all 0.2s',
              }}
            >
              Verificar ahora
            </button>
          </div>
        )}
      </IonHeader>

      {canViewCashClose && (
        <DailyCashCloseModal
          isOpen={showCashCloseModal}
          onClose={() => setShowCashCloseModal(false)}
        />
      )}

      <EmailVerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
      />

      {/* Modal Rápido Selector Multitasa (Solo administradores) */}
      {isAdmin && (
        <IonModal
          isOpen={showRateModal}
          onDidDismiss={() => setShowRateModal(false)}
          style={{ '--border-radius': '20px', '--max-width': '520px', '--max-height': '90vh' } as any}
        >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💱 Tasa de Facturación Activa
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Selecciona la tasa para nuevas ventas en caja y tienda
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRateModal(false)}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <IonIcon icon={closeOutline} style={{ fontSize: '18px', color: '#64748B' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Opción BCV */}
              <div
                onClick={() => handleApplyRateMode('BCV')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: exchangeRateMode === 'BCV' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: exchangeRateMode === 'BCV' ? '#ECFDF5' : '#F8FAFC',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏛️ Dólar Oficial BCV
                    {exchangeRateMode === 'BCV' && (
                      <span style={{ fontSize: '10px', background: '#10B981', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                        ACTIVA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Tasa legal de referencia oficial BCV
                  </div>
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>
                  Bs. {Number(availableRates?.bcv || exchangeRate).toFixed(2)}
                </div>
              </div>

              {/* Opción Paralelo */}
              <div
                onClick={() => handleApplyRateMode('PARALELO')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: exchangeRateMode === 'PARALELO' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: exchangeRateMode === 'PARALELO' ? '#ECFDF5' : '#F8FAFC',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📈 Dólar Paralelo / Promedio
                    {exchangeRateMode === 'PARALELO' && (
                      <span style={{ fontSize: '10px', background: '#10B981', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                        ACTIVA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    EnParaleloVzla / Cotización de mercado
                  </div>
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>
                  Bs. {Number(availableRates?.parallel || availableRates?.bcv || exchangeRate).toFixed(2)}
                </div>
              </div>

              {/* Opción USDT */}
              <div
                onClick={() => handleApplyRateMode('USDT')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: exchangeRateMode === 'USDT' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: exchangeRateMode === 'USDT' ? '#ECFDF5' : '#F8FAFC',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🟡 Binance P2P USDT
                    {exchangeRateMode === 'USDT' && (
                      <span style={{ fontSize: '10px', background: '#10B981', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                        ACTIVA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Cotización criptoactivo USDT/VES
                  </div>
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>
                  Bs. {Number(availableRates?.usdt || availableRates?.parallel || exchangeRate).toFixed(2)}
                </div>
              </div>

              {/* Opción Euro BCV */}
              <div
                onClick={() => handleApplyRateMode('EUR')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: exchangeRateMode === 'EUR' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: exchangeRateMode === 'EUR' ? '#ECFDF5' : '#F8FAFC',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💶 Euro Oficial BCV
                    {exchangeRateMode === 'EUR' && (
                      <span style={{ fontSize: '10px', background: '#10B981', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                        ACTIVA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Tasa oficial BCV en Euros
                  </div>
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>
                  Bs. {Number(availableRates?.eur || 40).toFixed(2)}
                </div>
              </div>

              {/* Opción Manual Personalizada */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: exchangeRateMode === 'MANUAL' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                  background: exchangeRateMode === 'MANUAL' ? '#FFFBEB' : '#ffffff',
                  marginTop: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ✏️ Tasa Personalizada Manual
                    {exchangeRateMode === 'MANUAL' && (
                      <span style={{ fontSize: '10px', background: '#F59E0B', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                        ACTIVA
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#78350F' }}>
                  Ingresa tu propio valor de tasa (ej. fijado por política interna de la tienda):
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.0001"
                    value={manualInputRate}
                    onChange={e => setManualInputRate(e.target.value)}
                    placeholder="Ej. 55.00"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 700,
                      background: '#ffffff',
                      color: '#0F172A'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyRateMode('MANUAL')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#F59E0B',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Fijar Manual
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonModal>
      )}
    </>
  );
};

export default AppHeader;
