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
  useIonToast,
  useIonAlert
} from '@ionic/react';
import {
  cloudDoneOutline,
  cloudOfflineOutline,
  walletOutline,
  syncOutline,
  refreshOutline
} from 'ionicons/icons';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import { apiClient } from '../api/client';
import { offlineDb } from '../services/offline-db';
import { DailyCashCloseModal } from './DailyCashCloseModal';

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
  title = 'Flujo Fino',
  subtitle,
  showRate = true,
  showOfflineToggle = true,
  showCashClose = true,
  onRefresh,
  children
}) => {
  const { user } = useContext(AuthContext);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showCashCloseModal, setShowCashCloseModal] = useState<boolean>(false);

  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    } catch (e) {}
    return 40.0;
  });

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
      if (res.data?.exchangeRateBs && Number(res.data.exchangeRateBs) > 0) {
        const rate = Number(res.data.exchangeRateBs);
        setExchangeRate(rate);
        localStorage.setItem('flujofino_exchange_rate', rate.toString());
      }
    } catch (e) {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && Number(saved) > 0) setExchangeRate(Number(saved));
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingCount();
    fetchRate();

    const interval = setInterval(refreshPendingCount, 6000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const toggleOfflineSimulation = async () => {
    const nextVal = !isSimulatingOffline;
    setIsSimulatingOffline(nextVal);
    if (nextVal) {
      presentToast({
        message: '⚡ Modo offline simulado activado para pruebas locales',
        duration: 2500,
        color: 'warning'
      });
    } else {
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

  const openRateAlert = () => {
    const isAdmin =
      user?.role === UserRole.ADMIN ||
      user?.role === UserRole.SUPERADMIN ||
      (user?.role as string) === 'ADMIN' ||
      (user?.role as string) === 'SUPERADMIN';

    if (!isAdmin) {
      presentToast({ message: 'Solo los administradores pueden modificar la tasa', duration: 2000, color: 'warning' });
      return;
    }

    presentAlert({
      header: 'Actualizar Tasa BCV',
      subHeader: 'Define la tasa de cambio en Bolívares (Bs./$)',
      inputs: [
        {
          name: 'rate',
          type: 'number',
          placeholder: 'Ej: 48.50',
          value: exchangeRate.toString(),
          attributes: { step: '0.01', min: '1' }
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const val = parseFloat(data.rate);
            if (val && val > 0) {
              try {
                await apiClient.put('/settings', { exchangeRateBs: val });
                setExchangeRate(val);
                localStorage.setItem('flujofino_exchange_rate', val.toString());
                presentToast({ message: `Tasa actualizada a Bs. ${val.toFixed(2)}`, duration: 2000, color: 'success' });
              } catch (e) {
                presentToast({ message: 'Error al actualizar tasa en el servidor', duration: 3000, color: 'danger' });
              }
            }
          }
        }
      ]
    });
  };

  const isDisconnected = !isOnline || isSimulatingOffline;

  return (
    <>
      <IonHeader className="ion-no-border">
        <IonToolbar className="ff-header-toolbar" style={{ '--background': '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '0 4px' } as any}>
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
                className="ff-pill ff-pill-interactive ff-pill-rate"
                onClick={openRateAlert}
                title="Tasa de cambio actual (Clic para cambiar)"
              >
                <span>Bs. {exchangeRate.toFixed(2)}</span>
              </div>
            )}

            {/* Cash Close Button */}
            {showCashClose && (
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
      </IonHeader>

      <DailyCashCloseModal
        isOpen={showCashCloseModal}
        onClose={() => setShowCashCloseModal(false)}
      />
    </>
  );
};

export default AppHeader;
