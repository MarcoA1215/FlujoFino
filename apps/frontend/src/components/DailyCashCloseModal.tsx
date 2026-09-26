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
  useIonToast
} from '@ionic/react';
import { closeOutline, logoWhatsapp, refreshOutline, walletOutline, cardOutline, phonePortraitOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';

interface DailyCashCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyCashCloseModal: React.FC<DailyCashCloseModalProps> = ({ isOpen, onClose }) => {
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [presentToast] = useIonToast();

  const fetchDailySummary = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/orders/daily-cash-summary');
      setCashSummary(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando arqueo de caja', duration: 3000, color: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDailySummary();
    }
  }, [isOpen]);

  const copyCashReportToWhatsApp = () => {
    if (!cashSummary) return;
    const text = `📊 *CIERRE DE CAJA / ARQUEO DIARIO*
📅 Fecha: ${cashSummary.date}
💱 Tasa BCV: Bs. ${Number(cashSummary.exchangeRate || 0).toFixed(2)}

💵 *TOTAL EFECTIVO USD:* $${Number(cashSummary.totalCashUSD || 0).toFixed(2)}
💳 *PUNTO DE VENTA (Bs.):* Bs. ${Number(cashSummary.totalPuntoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (equiv. $${Number(cashSummary.totalPuntoUSD || 0).toFixed(2)})
📱 *PAGO MÓVIL (Bs.):* Bs. ${Number(cashSummary.totalPagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (equiv. $${Number(cashSummary.totalPagoMovilUSD || 0).toFixed(2)})
💰 *TOTAL INGRESOS COBRADOS:* $${Number(cashSummary.totalPaidUSD || 0).toFixed(2)}
⏳ *PENDIENTE POR COBRAR:* $${Number(cashSummary.totalPendingUSD || 0).toFixed(2)}
📈 *VENTAS TOTALES DEL DÍA:* $${Number(cashSummary.totalSalesUSD || 0).toFixed(2)}

📦 *DESGLOSE DE PEDIDOS:*
- Total pedidos: ${cashSummary.ordersCount} (Pagados: ${cashSummary.paidOrdersCount}, Pendientes: ${cashSummary.pendingOrdersCount})
- 🏪 En Tienda: ${cashSummary.inStoreOrdersCount}
- 🛵 Delivery: ${cashSummary.deliveryOrdersCount}
- 🛒 Tienda Web: ${cashSummary.webOrdersCount}
${cashSummary.puntoList?.length > 0 ? `\n💳 *VENTAS POR PUNTO DE VENTA (${cashSummary.puntoList.length}):*\n` + cashSummary.puntoList.map((p: any) => `• Ref: ${p.ref || 'S/R'} | Bs. ${Number(p.amountBs).toFixed(2)} | ${p.bank || 'Punto'} | ${p.customerName || 'Cliente'}`).join('\n') : ''}
${cashSummary.pagoMovilList?.length > 0 ? `\n📱 *PAGOS MÓVILES REGISTRADOS (${cashSummary.pagoMovilList.length}):*\n` + cashSummary.pagoMovilList.map((p: any) => `• Ref: ${p.ref || 'S/R'} | Bs. ${Number(p.amountBs).toFixed(2)} | ${p.customerName || 'Cliente'}`).join('\n') : ''}
${cashSummary.vueltosList?.length > 0 ? `\n💵 *VUELTOS REGISTRADOS (${cashSummary.vueltosList.length}):*\n` + cashSummary.vueltosList.map((v: any) => `• #${v.orderNumber} - ${v.customerName}: $${Number(v.amountUsd).toFixed(2)} (${v.method === 'PAGO_MOVIL' ? `Pago Móvil Ref: ${v.ref}` : v.method === 'CASH_BS' ? 'Efectivo Bs' : 'Efectivo USD'})`).join('\n') : ''}
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      presentToast({ message: '¡Reporte copiado! Listo para pegar en WhatsApp.', duration: 3000, color: 'success' });
    } else {
      presentToast({ message: 'No se pudo acceder al portapapeles', duration: 3000, color: 'warning' });
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} style={{ '--border-radius': '20px' } as any}>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '4px 8px' } as any}>
          <IonTitle style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
            📊 Arqueo y Cierre de Caja
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={fetchDailySummary} color="medium">
              <IonIcon icon={refreshOutline} />
            </IonButton>
            <IonButton onClick={onClose} color="medium">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
          {loading && !cashSummary ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <IonSpinner name="crescent" color="primary" />
              <p style={{ marginTop: '12px', color: '#64748B', fontWeight: '500' }}>Calculando totales...</p>
            </div>
          ) : cashSummary ? (
            <div>
              {/* Header Info Banner */}
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>Fecha del Arqueo</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{cashSummary.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>Tasa Activa</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>Bs. {Number(cashSummary.exchangeRate || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* 3 Main Currency Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                {/* Cash USD */}
                <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px', borderLeft: '4px solid #10B981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#065F46' }}>
                    <IonIcon icon={walletOutline} /> EFECTIVO USD
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: '6px 0 2px 0' }}>
                    ${Number(cashSummary.totalCashUSD || 0).toFixed(2)}
                  </div>
                  <small style={{ color: '#64748B', fontSize: '11px' }}>{cashSummary.cashOrdersCount || 0} operaciones</small>
                </div>

                {/* Punto de Venta */}
                <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px', borderLeft: '4px solid #3B82F6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#1D4ED8' }}>
                    <IonIcon icon={cardOutline} /> PUNTO DE VENTA
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: '6px 0 2px 0' }}>
                    Bs. {Number(cashSummary.totalPuntoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <small style={{ color: '#64748B', fontSize: '11px' }}>≈ ${Number(cashSummary.totalPuntoUSD || 0).toFixed(2)} ({cashSummary.puntoList?.length || 0} v.)</small>
                </div>

                {/* Pago Movil */}
                <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px', borderLeft: '4px solid #8B5CF6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#6D28D9' }}>
                    <IonIcon icon={phonePortraitOutline} /> PAGO MÓVIL
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: '6px 0 2px 0' }}>
                    Bs. {Number(cashSummary.totalPagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <small style={{ color: '#64748B', fontSize: '11px' }}>≈ ${Number(cashSummary.totalPagoMovilUSD || 0).toFixed(2)} ({cashSummary.pagoMovilList?.length || 0} tr.)</small>
                </div>
              </div>

              {/* Sección de Vueltos Registrados */}
              {Array.isArray(cashSummary.vueltosList) && cashSummary.vueltosList.length > 0 && (
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px 16px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                      💵 Vueltos Entregados en el Día ({cashSummary.vueltosList.length})
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: '#F0FDF4', padding: '8px 10px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: '10px', color: '#166534', fontWeight: '700', display: 'block' }}>Vuelto en Divisas ($)</span>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: '#15803D' }}>-${Number(cashSummary.totalCashChangeUSD || 0).toFixed(2)} USD</span>
                    </div>
                    <div style={{ background: '#F5F3FF', padding: '8px 10px', borderRadius: '10px', border: '1px solid #DDD6FE' }}>
                      <span style={{ fontSize: '10px', color: '#6D28D9', fontWeight: '700', display: 'block' }}>Vuelto en Pago Móvil (Bs)</span>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: '#4C1D95' }}>-Bs. {Number(cashSummary.totalPagoMovilChangeBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {cashSummary.vueltosList.map((v: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', background: '#F8FAFC', padding: '6px 8px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                        <div>
                          <b>#{v.orderNumber}</b> - {v.customerName}
                          <span style={{ display: 'block', color: '#64748B', fontSize: '10px' }}>
                            {v.method === 'PAGO_MOVIL' ? `📱 Pago Móvil (Ref: ${v.ref})` : v.method === 'CASH_BS' ? '🇻🇪 Efectivo Bs' : '💵 Efectivo USD'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: '800', color: v.method === 'PAGO_MOVIL' ? '#6D28D9' : '#059669' }}>
                          ${Number(v.amountUsd).toFixed(2)}
                          {v.method === 'PAGO_MOVIL' && (
                            <span style={{ display: 'block', fontSize: '9px', fontWeight: '600' }}>Bs. {Number(v.amountBs).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals Summary Card */}
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B', fontSize: '13px', fontWeight: '600' }}>Total Cobrado Real:</span>
                  <span style={{ fontWeight: '800', color: '#10B981', fontSize: '15px' }}>${Number(cashSummary.totalPaidUSD || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B', fontSize: '13px', fontWeight: '600' }}>Pendiente por Cobrar:</span>
                  <span style={{ fontWeight: '800', color: '#F59E0B', fontSize: '15px' }}>${Number(cashSummary.totalPendingUSD || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                  <span style={{ color: '#0F172A', fontSize: '14px', fontWeight: '800' }}>Ventas Totales del Día:</span>
                  <span style={{ fontWeight: '900', color: '#0F172A', fontSize: '16px' }}>${Number(cashSummary.totalSalesUSD || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Channels Breakdown */}
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>📦 Desglose de Canales</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', gap: '6px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{cashSummary.inStoreOrdersCount}</div>
                    <small style={{ color: '#64748B', fontSize: '11px' }}>En Tienda</small>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#3B82F6' }}>{cashSummary.deliveryOrdersCount}</div>
                    <small style={{ color: '#64748B', fontSize: '11px' }}>Delivery</small>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#8B5CF6' }}>{cashSummary.webOrdersCount}</div>
                    <small style={{ color: '#64748B', fontSize: '11px' }}>Web</small>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>{cashSummary.ordersCount}</div>
                    <small style={{ color: '#64748B', fontSize: '11px' }}>Total</small>
                  </div>
                </div>
              </div>

              {/* Action: Copy to WhatsApp */}
              <button
                type="button"
                onClick={copyCashReportToWhatsApp}
                className="ff-btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '15px', background: '#25D366' }}
              >
                <IonIcon icon={logoWhatsapp} style={{ fontSize: '18px' }} />
                Copiar Reporte para WhatsApp
              </button>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#64748B' }}>No hay información de caja para el día de hoy.</p>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
