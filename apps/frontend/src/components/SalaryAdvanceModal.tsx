import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  useIonToast,
  useIonAlert,
} from '@ionic/react';
import { closeOutline, cashOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';

interface SalaryAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  employees?: { id: string; username: string; name?: string; role?: string }[];
  defaultExchangeRate?: number;
}

export const SalaryAdvanceModal: React.FC<SalaryAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employees: propEmployees,
  defaultExchangeRate,
}) => {
  const [employees, setEmployees] = useState<any[]>(propEmployees || []);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [amountUSD, setAmountUSD] = useState<string>('');
  const [amountBS, setAmountBS] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    } catch (e) {}
    if (defaultExchangeRate && defaultExchangeRate > 0) {
      return defaultExchangeRate;
    }
    return 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  useEffect(() => {
    if (defaultExchangeRate && defaultExchangeRate > 0) {
      setExchangeRate(defaultExchangeRate);
    }
  }, [defaultExchangeRate]);

  // Synchronize when propEmployees updates from parent
  useEffect(() => {
    if (propEmployees && propEmployees.length > 0) {
      setEmployees(propEmployees);
      setSelectedUserId((current) => {
        if (current && propEmployees.some((e) => e.id === current)) return current;
        return propEmployees[0].id;
      });
    }
  }, [propEmployees]);

  useEffect(() => {
    if (isOpen) {
      // Fetch exchange rate
      apiClient
        .get('/settings/exchange-rate')
        .then((res) => {
          const fetchedRate = Number(res.data?.exchangeRateBs || res.data?.rate || res.data);
          if (!isNaN(fetchedRate) && fetchedRate > 0) {
            setExchangeRate(fetchedRate);
            setAmountUSD((currentUSD) => {
              const num = parseFloat(currentUSD);
              if (!isNaN(num) && num > 0) {
                setAmountBS((num * fetchedRate).toFixed(2));
              }
              return currentUSD;
            });
          }
        })
        .catch(() => {});

      // If propEmployees is already provided with items, ensure it's loaded
      if (propEmployees && propEmployees.length > 0) {
        setEmployees(propEmployees);
        setSelectedUserId((current) => {
          if (current && propEmployees.some((e) => e.id === current)) return current;
          return propEmployees[0].id;
        });
        return;
      }

      // Otherwise fetch active employees with fallback
      const fetchEmployees = async () => {
        setIsLoadingEmployees(true);
        let loaded: any[] = [];
        try {
          const res = await apiClient.get('/users/employees');
          if (Array.isArray(res.data) && res.data.length > 0) {
            loaded = res.data;
          }
        } catch (err) {
          console.warn('Error cargando /users/employees en SalaryAdvanceModal:', err);
        }

        if (loaded.length === 0) {
          try {
            const fallbackRes = await apiClient.get('/users');
            if (Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
              loaded = fallbackRes.data;
            }
          } catch (fallbackErr) {
            console.warn('Error cargando fallback /users en SalaryAdvanceModal:', fallbackErr);
          }
        }

        setEmployees(loaded);
        if (loaded.length > 0) {
          setSelectedUserId((current) => {
            if (current && loaded.some((e) => e.id === current)) return current;
            return loaded[0].id;
          });
        }
        setIsLoadingEmployees(false);
      };

      fetchEmployees();
    }
  }, [isOpen, propEmployees]);

  const handleUSDChange = (val: string) => {
    setAmountUSD(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmountBS((num * exchangeRate).toFixed(2));
    } else {
      setAmountBS('');
    }
  };

  const handleBSChange = (val: string) => {
    setAmountBS(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && exchangeRate > 0) {
      setAmountUSD((num / exchangeRate).toFixed(2));
    } else {
      setAmountUSD('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      presentToast({ message: 'Selecciona un trabajador', duration: 2500, color: 'warning' });
      return;
    }

    const usd = parseFloat(amountUSD);
    if (isNaN(usd) || usd <= 0) {
      presentToast({ message: 'Ingresa un monto válido mayor a 0', duration: 2500, color: 'warning' });
      return;
    }

    const bs = parseFloat(amountBS) || Number((usd * exchangeRate).toFixed(2));

    const emp = employees.find((e) => e.id === selectedUserId);
    const empName = emp?.username || emp?.name || 'Empleado';

    presentAlert({
      header: 'Confirmar Salida de Dinero (Vale)',
      subHeader: `Empleado: ${empName}`,
      message: `Se registrará una salida física de caja por $${usd.toFixed(2)} USD (Bs. ${bs.toFixed(2)}) bajo concepto de Vale/Anticipo. ¿Deseas continuar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar Vale',
          handler: async () => {
            setIsSubmitting(true);
            try {
              await apiClient.post('/salary-advances', {
                userId: selectedUserId,
                amountUSD: usd,
                amountBS: bs,
                exchangeRate,
                reason: reason.trim() || 'Anticipo / Vale de Nómina',
                date,
              });

              presentToast({
                message: `✅ Vale de $${usd.toFixed(2)} registrado y egreso descontado de caja`,
                duration: 3500,
                color: 'success',
              });

              setAmountUSD('');
              setAmountBS('');
              setReason('');
              onClose();
              if (onSuccess) onSuccess();
            } catch (err: any) {
              const msg = err.response?.data?.message || 'Error al registrar vale';
              presentToast({ message: msg, duration: 4000, color: 'danger' });
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} style={{ ['--max-width' as any]: '460px', ['--border-radius' as any]: '16px' }}>
      <IonHeader>
        <IonToolbar style={{ ['--background' as any]: '#0F172A', color: '#ffffff' }}>
          <IonTitle style={{ fontSize: '1.1rem', fontWeight: 800 }}>Registrar Vale / Anticipo</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" color="light" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ ['--background' as any]: '#F8FAFC' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#1E40AF' }}>
            ℹ️ Este vale se registrará como egreso en la caja física activa (categoría <b>VALE_EMPLEADO</b>) y quedará pendiente para descontar en nómina.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
              Trabajador *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isLoadingEmployees || employees.length === 0}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0F172A',
                minHeight: '44px',
                outline: 'none',
              }}
            >
              <option value="">
                {isLoadingEmployees
                  ? 'Cargando trabajadores...'
                  : employees.length === 0
                  ? 'No hay trabajadores disponibles'
                  : 'Selecciona trabajador...'}
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  👤 {e.name ? `${e.name} (${e.username})` : e.username} {e.jobTitle ? `• ${e.jobTitle}` : e.role ? `• ${e.role}` : ''}
                </option>
              ))}
            </select>

            {isLoadingEmployees && (
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonSpinner name="dots" style={{ width: '16px', height: '16px' }} />
                <span>Cargando lista de personal...</span>
              </div>
            )}

            {!isLoadingEmployees && employees.length === 0 && (
              <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px', background: '#FEF2F2', padding: '8px 10px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                ⚠️ No se encontraron trabajadores registrados en este negocio. Ve a la sección de Personal para registrar empleados.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                Monto en USD ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountUSD}
                onChange={(e) => handleUSDChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0F172A',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                Equivalente en Bs.
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountBS}
                onChange={(e) => handleBSChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '-6px' }}>
            Tasa de cambio activa: <b>Bs. {exchangeRate > 0 ? exchangeRate.toFixed(2) : '0.00'} / USD</b>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
              Motivo o Detalle del Vale
            </label>
            <input
              type="text"
              placeholder="Ej. Anticipo de semana, Almuerzo, Emergencia"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#ffffff',
                fontSize: '13px',
                color: '#0F172A',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#ffffff',
                fontSize: '13px',
                color: '#0F172A',
              }}
            />
          </div>

          <div style={{ marginTop: '10px' }}>
            <IonButton
              expand="block"
              type="submit"
              color="danger"
              disabled={isSubmitting}
              style={{ height: '48px', fontWeight: 700, fontSize: '1rem' }}
            >
              <IonIcon slot="start" icon={cashOutline} />
              {isSubmitting ? 'Registrando...' : 'Egresar y Registrar Vale'}
            </IonButton>
          </div>
        </form>
      </IonContent>
    </IonModal>
  );
};

export default SalaryAdvanceModal;
