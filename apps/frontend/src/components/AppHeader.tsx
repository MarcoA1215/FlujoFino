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
import { useLoading } from '../context/LoadingContext';
import { UserRole, APP_NAME } from '@finowork/shared-types';
import { apiClient } from '../api/client';
import { offlineDb } from '../services/offline-db';
import { DailyCashCloseModal } from './DailyCashCloseModal';
import { EmailVerificationModal } from './EmailVerificationModal';
import { SubscriptionWarningBanner } from './SubscriptionWarningBanner';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showRate?: boolean;
  showOfflineToggle?: boolean;
  showCashClose?: boolean;
  onRefresh?: () => void | Promise<unknown>;
  children?: React.ReactNode;
}

let isGlobalSyncInProgress = false;

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
  const { showLoading, hideLoading } = useLoading();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    showLoading('Actualizando...');
    let failed = false;
    try {
      await Promise.all([
        Promise.resolve(onRefresh()),
        new Promise(resolve => setTimeout(resolve, 600)),
      ]);
    } catch (e) {
      failed = true;
      console.error(e);
    } finally {
      hideLoading();
      setIsRefreshing(false);
    }
    if (!failed) {
      presentToast({
        message: 'Información actualizada',
        duration: 1500,
        position: 'bottom',
        color: 'light',
        cssClass: 'ff-subtle-toast',
      });
    }
  };

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
  const [pendingAccessCount, setPendingAccessCount] = useState<number>(0);

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
  const [enableCopCurrency, setEnableCopCurrency] = useState<boolean>(() => {
    try {
      return localStorage.getItem('flujofino_enable_cop') === 'true';
    } catch {
      return false;
    }
  });
  const [exchangeRateCop, setExchangeRateCop] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flujofino_exchange_rate_cop');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) return Number(saved);
    } catch {}
    return 4000;
  });
  const [exchangeRateCopMode, setExchangeRateCopMode] = useState<'AUTO' | 'MANUAL'>(() => {
    try {
      return (localStorage.getItem('flujofino_rate_cop_mode') as 'AUTO' | 'MANUAL') || 'AUTO';
    } catch {
      return 'AUTO';
    }
  });
  const [manualCopInput, setManualCopInput] = useState<string>('4000');

  const refreshPendingCount = async () => {
    try {
      const allOrders = user?.tenantId
        ? await offlineDb.getOfflineOrdersByTenant(user.tenantId)
        : [];
      const count = allOrders.filter(o => o.status !== 'synced').length;
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

        const copEnabled = Boolean(res.data.enableCopCurrency);
        const copRate = Number(res.data.exchangeRateCop || 4000);
        const copMode = (res.data.exchangeRateCopMode === 'MANUAL' ? 'MANUAL' : 'AUTO') as 'AUTO' | 'MANUAL';
        setEnableCopCurrency(copEnabled);
        setExchangeRateCop(copRate);
        setExchangeRateCopMode(copMode);
        setManualCopInput(String(res.data.manualExchangeRateCop || copRate || 4000));

        localStorage.setItem('flujofino_exchange_rate', rate.toString());
        localStorage.setItem('flujofino_rate_mode', mode);
        localStorage.setItem('flujofino_currency_symbol', symbol);
        localStorage.setItem('flujofino_enable_cop', String(copEnabled));
        localStorage.setItem('flujofino_exchange_rate_cop', String(copRate));
        localStorage.setItem('flujofino_rate_cop_mode', copMode);
      }
    } catch (e) {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && Number(saved) > 0) setExchangeRate(Number(saved));
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (localStorage.getItem('flujofino_simulating_offline') !== 'true') {
        setTimeout(() => {
          syncPendingOrders(true);
        }, 1500);
      }
    };
    const handleOffline = () => setIsOnline(false);

    const handleSettingsUpdated = (e: any) => {
      const s = e.detail;
      if (s) {
        if (s.exchangeRateBs) setExchangeRate(Number(s.exchangeRateBs));
        if (s.exchangeRateMode) setExchangeRateMode(s.exchangeRateMode);
        if (s.currencySymbol) setCurrencySymbol(s.currencySymbol);
        if (s.availableRates) setAvailableRates(s.availableRates);
        if (s.manualExchangeRate) setManualInputRate(s.manualExchangeRate.toString());
        if (s.enableCopCurrency !== undefined) {
          setEnableCopCurrency(Boolean(s.enableCopCurrency));
          localStorage.setItem('flujofino_enable_cop', String(Boolean(s.enableCopCurrency)));
        }
        if (s.exchangeRateCop) {
          setExchangeRateCop(Number(s.exchangeRateCop));
          localStorage.setItem('flujofino_exchange_rate_cop', String(Number(s.exchangeRateCop)));
        }
        if (s.exchangeRateCopMode) {
          setExchangeRateCopMode(s.exchangeRateCopMode);
          localStorage.setItem('flujofino_rate_cop_mode', s.exchangeRateCopMode);
        }
        if (s.manualExchangeRateCop) {
          setManualCopInput(String(s.manualExchangeRateCop));
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('settings_updated', handleSettingsUpdated);

    let isMounted = true;
    const safeRefresh = async () => {
      if (isMounted) {
        await refreshPendingCount();
        if (navigator.onLine && localStorage.getItem('flujofino_simulating_offline') !== 'true' && user?.tenantId) {
          try {
            const allOrders = await offlineDb.getOfflineOrdersByTenant(user.tenantId);
            const pendingCount = allOrders.filter(o => o.status !== 'failed' && o.status !== 'syncing').length;
            if (pendingCount > 0 && !isGlobalSyncInProgress) {
              await syncPendingOrders(true);
            }
          } catch (e) {}
        }
      }
    };

    safeRefresh();
    fetchRate();

    const interval = setInterval(safeRefresh, 15000);
    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('settings_updated', handleSettingsUpdated);
      clearInterval(interval);
    };
  }, []);

  const fetchPendingAccessRequests = async () => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.get<any[]>('/users/access-requests');
      if (Array.isArray(res.data)) {
        setPendingAccessCount(res.data.length);
      }
    } catch (e) {
      // Background check silent
    }
  };

  useEffect(() => {
    if (isAdmin) {
      let isMounted = true;
      const safeFetch = async () => {
        if (isMounted) await fetchPendingAccessRequests();
      };
      safeFetch();
      const interval = setInterval(safeFetch, 15000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [isAdmin]);

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

  const syncPendingOrders = async (silent: boolean = false, retryFailed: boolean = false) => {
    if (isSimulatingOffline || !navigator.onLine) {
      if (!silent) presentToast({ message: 'No hay conexión a internet activa', duration: 2500, color: 'warning' });
      return;
    }
    if (!user?.tenantId) return;
    if (isGlobalSyncInProgress || isSyncing) return;

    let ordersToProcess: any[] = [];
    try {
      const allOrders = await offlineDb.getOfflineOrdersByTenant(user.tenantId);
      const pending = retryFailed
        ? allOrders.filter(o => o.status !== 'syncing')
        : allOrders.filter(o => o.status !== 'failed' && o.status !== 'syncing');

      if (!pending || pending.length === 0) {
        const failedCount = allOrders.filter(o => o.status === 'failed').length;
        setPendingOfflineCount(0);
        if (!silent) {
          if (failedCount > 0) {
            presentToast({ message: `No hay órdenes pendientes normales. (${failedCount} venta(s) con error previo)`, duration: 3500, color: 'warning' });
          } else {
            presentToast({ message: 'No hay ventas pendientes por sincronizar', duration: 2000, color: 'light' });
          }
        }
        return;
      }

      isGlobalSyncInProgress = true;
      setIsSyncing(true);
      ordersToProcess = pending;

      // Marcar órdenes en estado 'syncing' en Dexie de inmediato para evitar envíos concurrentes
      for (const order of pending) {
        await offlineDb.offlineOrders.update(order.offlineId, { status: 'syncing' });
      }

      // skipGlobalLoading: true para no bloquear la aplicación con pantalla de carga mientras se sincroniza
      const response = await apiClient.post(
        '/orders/sync-offline',
        { orders: pending },
        { skipGlobalLoading: true } as any
      );
      const syncedIds: string[] = response.data?.syncedOfflineIds || [];
      const failedOrders: Array<{ offlineId: string; error: string }> = response.data?.failedOrders || [];

      if (syncedIds.length > 0) {
        await offlineDb.offlineOrders.bulkDelete(syncedIds);
        await refreshPendingCount();
        presentToast({
          message: `✓ ${syncedIds.length} venta(s) offline sincronizada(s) con éxito`,
          duration: 3000,
          color: 'success'
        });
        if (onRefresh) onRefresh();
      }

      if (failedOrders.length > 0) {
        for (const failed of failedOrders) {
          const existing = await offlineDb.offlineOrders.get(failed.offlineId);
          if (existing) {
            await offlineDb.offlineOrders.update(failed.offlineId, {
              status: 'failed',
              syncError: failed.error || 'Error en servidor',
              retryCount: (existing.retryCount || 0) + 1,
            });
          }
        }
        await refreshPendingCount();
        const firstErr = failedOrders[0]?.error || 'Error desconocido';
        presentToast({
          message: `⚠️ ${failedOrders.length} venta(s) no se pudieron sincronizar: ${firstErr}`,
          duration: 5000,
          color: 'warning'
        });
      } else if (syncedIds.length === 0 && !silent) {
        presentToast({ message: 'No se procesaron ventas para sincronizar', duration: 2500, color: 'medium' });
      }
    } catch (err: any) {
      console.error('Error sincronizando órdenes offline:', err);
      // Revertir estado 'syncing' a 'pending' en Dexie para reintento posterior
      for (const order of ordersToProcess) {
        try {
          const current = await offlineDb.offlineOrders.get(order.offlineId);
          if (current && current.status === 'syncing') {
            await offlineDb.offlineOrders.update(order.offlineId, { status: 'pending' });
          }
        } catch (_) {}
      }
      if (!silent) {
        presentToast({
          message: 'Error al sincronizar con el servidor: ' + (err.response?.data?.message || err.message),
          duration: 3500,
          color: 'danger'
        });
      }
    } finally {
      isGlobalSyncInProgress = false;
      setIsSyncing(false);
      await refreshPendingCount();
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

  const handleApplyCopRate = async (copMode: 'AUTO' | 'MANUAL') => {
    if (!isAdmin) return;
    try {
      let targetCopRate = Number(availableRates?.cop || exchangeRateCop || 4000);
      if (copMode === 'MANUAL') {
        const parsed = parseFloat(manualCopInput);
        if (!parsed || parsed <= 0) {
          presentToast({ message: 'Ingresa una tasa COP válida mayor a cero', duration: 2500, color: 'warning' });
          return;
        }
        targetCopRate = parsed;
      }

      await apiClient.put('/settings/exchange-rate', {
        rate: exchangeRate,
        mode: exchangeRateMode,
        currencySymbol,
        enableCopCurrency: true,
        exchangeRateCopMode: copMode,
        exchangeRateCop: targetCopRate,
        manualExchangeRateCop: copMode === 'MANUAL' ? targetCopRate : undefined,
      });

      setExchangeRateCopMode(copMode);
      setExchangeRateCop(targetCopRate);
      localStorage.setItem('flujofino_exchange_rate_cop', String(targetCopRate));
      localStorage.setItem('flujofino_rate_cop_mode', copMode);

      window.dispatchEvent(
        new CustomEvent('settings_updated', {
          detail: {
            enableCopCurrency: true,
            exchangeRateCop: targetCopRate,
            exchangeRateCopMode: copMode,
            manualExchangeRateCop: copMode === 'MANUAL' ? targetCopRate : undefined,
          },
        })
      );

      presentToast({
        message: `🇨🇴 Tasa COP actualizada (${copMode === 'AUTO' ? 'TRM Oficial' : 'Manual'}): $${Number(targetCopRate).toLocaleString('es-CO')} COP`,
        duration: 2500,
        color: 'success',
      });
      setShowRateModal(false);
    } catch (e) {
      presentToast({ message: 'Error al actualizar la tasa COP', duration: 2500, color: 'danger' });
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

  const hasAnyPills = Boolean(
    showOfflineToggle ||
    pendingOfflineCount > 0 ||
    (isAdmin && pendingAccessCount > 0) ||
    showRate
  );

  const renderPills = () => (
    <>
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
          onClick={() => syncPendingOrders(false, true)}
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

      {/* Access Requests Alert Pill for Admin */}
      {isAdmin && pendingAccessCount > 0 && (
        <div
          className="ff-pill ff-pill-interactive ff-pill-sync"
          onClick={() => window.location.href = '/users'}
          title="Solicitudes de acceso de empleados pendientes de autorización"
          style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}
        >
          <span className="ff-pill-dot" style={{ background: '#F59E0B' }} />
          <span>⏳ {pendingAccessCount} {pendingAccessCount === 1 ? 'Acceso' : 'Accesos'}</span>
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

      {/* COP Tri-Currency Pill (Shown when business enables Pesos Colombianos) */}
      {showRate && enableCopCurrency && (
        <div
          className={`ff-pill ${isAdmin ? 'ff-pill-interactive' : ''}`}
          onClick={() => {
            if (isAdmin) {
              setShowRateModal(true);
            } else {
              presentToast({
                message: '🔒 Solo un administrador puede modificar la tasa COP del negocio',
                duration: 2500,
                color: 'warning',
              });
            }
          }}
          title={`Tasa Pesos Colombianos (${exchangeRateCopMode === 'AUTO' ? 'TRM Oficial' : 'Tasa Frontera Manual'})`}
          style={{
            cursor: isAdmin ? 'pointer' : 'default',
            userSelect: 'none',
            background: '#FEF9C3',
            color: '#854D0E',
            border: '1px solid #FDE047',
            fontWeight: 800,
          }}
        >
          <span>🇨🇴 COP: ${Number(exchangeRateCop || 4000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
        </div>
      )}
    </>
  );

  return (
    <>
      <IonHeader className="ion-no-border">
        <IonToolbar className={`ff-header-toolbar ${hasAnyPills ? 'ff-has-subbar' : ''}`} style={{ '--background': 'var(--theme-header, #ffffff)', padding: '0 4px' } as any}>
          <IonButtons slot="start">
            <IonMenuButton style={{ color: 'var(--theme-header-contrast, #0F172A)' }} />
          </IonButtons>

          <IonTitle style={{ padding: '0 6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--theme-header-contrast, #0F172A)', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </span>
              {subtitle && (
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--theme-header-contrast, #64748B)', opacity: 0.85, marginTop: '-2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {subtitle}
                </span>
              )}
            </div>
          </IonTitle>

          <IonButtons slot="end" style={{ gap: '6px', display: 'flex', alignItems: 'center' }}>
            {/* Desktop pills container */}
            <div className="ff-header-pills-desktop" style={{ gap: '6px', alignItems: 'center' }}>
              {renderPills()}
            </div>

            {/* Cash Close Button */}
            {showCashClose && canViewCashClose && (
              <IonButton
                fill="clear"
                onClick={() => setShowCashCloseModal(true)}
                title="Cierre de caja / Arqueo diario"
                style={{ '--padding-start': '6px', '--padding-end': '6px', height: '36px', color: 'var(--theme-header-contrast, #0F172A)' }}
              >
                <IonIcon icon={walletOutline} style={{ fontSize: '20px' }} />
              </IonButton>
            )}

            {/* Optional Refresh */}
            {onRefresh && (
              <IonButton
                fill="clear"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title="Recargar"
                style={{ '--padding-start': '4px', '--padding-end': '4px', height: '36px', color: 'var(--theme-header-contrast, #64748B)' }}
              >
                <IonIcon icon={refreshOutline} style={{ fontSize: '18px' }} />
              </IonButton>
            )}

            {children}
          </IonButtons>
        </IonToolbar>

        {/* Responsive Mobile Subbar for status & currency pills (Nothing gets cut off) */}
        {hasAnyPills && (
          <div className="ff-header-subbar-mobile">
            {renderPills()}
          </div>
        )}
        
        <SubscriptionWarningBanner />

        {isDisconnected && (
          <div
            style={{
              background: '#FFFBEB',
              borderBottom: '1px solid #FDE68A',
              padding: '7px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#92400E',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            <span>⚡</span>
            <span>
              <strong>Modo Sin Conexión:</strong> Operando localmente. Las ventas se sincronizarán al reconectar.
            </span>
          </div>
        )}

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

              {/* Sección Triángulo Multi-Moneda: Pesos Colombianos (COP) */}
              {enableCopCurrency && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '14px',
                    borderRadius: '14px',
                    border: '2px solid #FDE047',
                    background: '#FEFCE8',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#854D0E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🇨🇴 Tasa Pesos Colombianos (COP)
                      <span style={{ fontSize: '10px', background: '#CA8A04', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                        {exchangeRateCopMode === 'AUTO' ? 'TRM AUTO' : 'MANUAL'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyCopRate('AUTO')}
                      style={{
                        background: exchangeRateCopMode === 'AUTO' ? '#10B981' : '#ffffff',
                        color: exchangeRateCopMode === 'AUTO' ? '#ffffff' : '#0F172A',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      🌐 Usar TRM ({Number(availableRates?.cop || exchangeRateCop || 4000).toLocaleString('es-CO', { maximumFractionDigits: 0 })})
                    </button>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#713F12' }}>
                    O personaliza la tasa en pesos por cada $1 USD para tu zona:
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={manualCopInput}
                      onChange={e => setManualCopInput(e.target.value)}
                      placeholder="Ej. 4000"
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #FDE047',
                        fontSize: '14px',
                        fontWeight: 800,
                        background: '#ffffff',
                        color: '#0F172A'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCopRate('MANUAL')}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#CA8A04',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Fijar COP
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </IonModal>
      )}
    </>
  );
};

export default AppHeader;
