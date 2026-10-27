import React, { useEffect, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonItem,
  IonLabel,
  useIonToast,
  useIonAlert,
} from '@ionic/react';
import { copyOutline, logoWhatsapp } from 'ionicons/icons';
import { apiClient } from '../api/client';
import {
  PromoterCommissionStatus,
  PromoterCommissionType,
  type PromoterCommissionDTO,
  type SuperAdminPromoterDTO,
} from '@finowork/shared-types';

interface Props {
  promoter: SuperAdminPromoterDTO | null;
  rate: number;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}

const fmtBs = (n: number) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const waNumber = (raw: string) => {
  const d = raw.replace(/[^0-9]/g, '');
  if (!d) return '';
  return d.startsWith('58') ? d : '58' + d.replace(/^0+/, '');
};

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const copyBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#64748b',
  padding: '6px',
  display: 'inline-flex',
  minWidth: '32px',
  minHeight: '32px',
  alignItems: 'center',
  justifyContent: 'center',
};

export const PromoterPayoutCenter: React.FC<Props> = ({ promoter, rate, onClose, onChanged }) => {
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const [data, setData] = useState<SuperAdminPromoterDTO | null>(promoter);
  const [tab, setTab] = useState<'commissions' | 'affiliates'>('commissions');
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<'NONE' | 'BULK'>('NONE');
  const [method, setMethod] = useState<'PAGO_MOVIL' | 'BINANCE'>('PAGO_MOVIL');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setData(promoter);
    setTab('commissions');
    setSelected([]);
    setMode('NONE');
    setReference('');
  }, [promoter]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      presentToast({ message: `${label} copiado`, duration: 1500, color: 'success' });
    } catch {
      presentToast({ message: `No se pudo copiar ${label}`, duration: 2000, color: 'warning' });
    }
  };

  const sendReceipt = (
    p: SuperAdminPromoterDTO,
    comms: PromoterCommissionDTO[],
    ref: string,
    m: 'PAGO_MOVIL' | 'BINANCE',
  ) => {
    const totalUSD = comms.reduce((s, c) => s + c.amountUSD, 0);
    let msg = `*COMPROBANTE DE PAGO DE COMISIONES - FINOWORK*\n`;
    msg += `Promotor: ${p.username} (${p.code})\n`;
    msg += `Fecha: ${new Date().toLocaleDateString('es-VE')}\n`;
    msg += `Total: $${totalUSD.toFixed(2)} USD\n`;
    if (m === 'PAGO_MOVIL') {
      msg += `Tasa: Bs. ${rate.toFixed(2)} / USD\nMonto: Bs. ${fmtBs(totalUSD * rate)}\n`;
    }
    msg += `Método: ${m === 'BINANCE' ? 'Binance Pay' : 'Pago Móvil'}\nReferencia: ${ref}\n\n*Detalle:*\n`;
    comms.forEach((c, i) => {
      const t = c.type === PromoterCommissionType.ACTIVATION ? 'Activación' : 'Recurrente';
      msg += `${i + 1}. ${c.tenantName || 'Comercio'} - ${t}: $${c.amountUSD.toFixed(2)}\n`;
    });
    msg += `\n¡Gracias por impulsar FinoWork!`;
    const num = waNumber(p.phone || p.pagoMovilPhone || '');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const payBulk = async () => {
    if (!data) return;
    if (!reference.trim()) {
      presentToast({ message: 'Ingresa la referencia del pago', duration: 2500, color: 'warning' });
      return;
    }
    const ids = (selected.length > 0
      ? data.commissions.filter((c) => selected.includes(c.id))
      : data.commissions
    )
      .filter((c) => c.status === PromoterCommissionStatus.PENDING)
      .map((c) => c.id);
    if (ids.length === 0) return;

    try {
      setBusy(true);
      const label = `${method === 'BINANCE' ? 'Binance Pay' : 'Pago Móvil'}: ${reference.trim()}`;
      const res = await apiClient.post<{ paidCount: number; totalPaidUSD: number }>(
        `/superadmin/promoters/${data.id}/payout-bulk`,
        { paymentReference: label, commissionIds: ids },
      );
      const paid = data.commissions.filter((c) => ids.includes(c.id));
      const updated: SuperAdminPromoterDTO = {
        ...data,
        commissions: data.commissions.map((c) =>
          ids.includes(c.id)
            ? { ...c, status: PromoterCommissionStatus.PAID, paymentReference: label, paidAt: new Date().toISOString() }
            : c,
        ),
        pendingBalanceUSD: Math.max(0, data.pendingBalanceUSD - res.data.totalPaidUSD),
        paidBalanceUSD: data.paidBalanceUSD + res.data.totalPaidUSD,
      };
      setData(updated);
      setSelected([]);
      setMode('NONE');
      const ref = reference.trim();
      const m = method;
      setReference('');
      await onChanged();
      presentAlert({
        header: 'Pago registrado',
        message: `${res.data.paidCount} comisión(es) por $${res.data.totalPaidUSD} USD. ¿Enviar comprobante por WhatsApp?`,
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Enviar', handler: () => sendReceipt(updated, paid, ref, m) },
        ],
      });
    } catch (e: any) {
      presentToast({
        message: 'Error: ' + (e.response?.data?.message || e.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const pending = data?.commissions.filter((c) => c.status === PromoterCommissionStatus.PENDING) || [];
  const target = selected.length > 0 ? pending.filter((c) => selected.includes(c.id)) : pending;
  const targetUSD = target.reduce((s, c) => s + c.amountUSD, 0);
  const pendingBs = (data?.pendingBalanceUSD || 0) * rate;

  const row = (label: string, value?: string | null) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '2px 0' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        <strong style={{ color: '#0f172a' }}>{value || 'No registrado'}</strong>
        {value && (
          <button type="button" style={copyBtn} onClick={() => copy(value, label)}>
            <IonIcon icon={copyOutline} style={{ fontSize: '15px' }} />
          </button>
        )}
      </span>
    </div>
  );

  return (
    <IonModal isOpen={!!promoter} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle style={{ fontWeight: 800, fontSize: '16px' }}>
            Liquidación • {data?.username} ({data?.code})
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
        {data && (
          <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '80px' }}>
            {/* Sub-tabs */}
            <div style={{ ...card, padding: '4px', display: 'flex', gap: '4px', marginBottom: '14px' }}>
              {(['commissions', 'affiliates'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    minHeight: '42px',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '13px',
                    background: tab === t ? 'var(--theme-primary, #10B981)' : 'transparent',
                    color: tab === t ? 'var(--theme-primary-contrast, #ffffff)' : '#475569',
                  }}
                >
                  {t === 'commissions'
                    ? `💳 Liquidación (${pending.length} pend.)`
                    : `🏬 Comercios (${data.affiliatedTenants?.length || 0})`}
                </button>
              ))}
            </div>

            {tab === 'commissions' && (
              <>
                {/* Cuentas + conversión */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ ...card, padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>📱 Pago Móvil</strong>
                      <button
                        type="button"
                        style={{ ...copyBtn, fontSize: '11px', fontWeight: 700, color: '#0369a1' }}
                        onClick={() =>
                          copy(
                            `Banco: ${data.pagoMovilBank || '-'}\nTeléfono: ${data.pagoMovilPhone || '-'}\nCédula: ${data.pagoMovilCedula || '-'}\nMonto: Bs. ${fmtBs(pendingBs)}`,
                            'Datos Pago Móvil',
                          )
                        }
                      >
                        <IonIcon icon={copyOutline} /> Copiar todo
                      </button>
                    </div>
                    {row('Banco', data.pagoMovilBank)}
                    {row('Teléfono', data.pagoMovilPhone)}
                    {row('Cédula', data.pagoMovilCedula)}
                    {waNumber(data.phone || data.pagoMovilPhone || '') && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://wa.me/${waNumber(data.phone || data.pagoMovilPhone || '')}`, '_blank')}
                        style={{ marginTop: '8px', width: '100%', minHeight: '38px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                      >
                        <IonIcon icon={logoWhatsapp} style={{ verticalAlign: 'middle' }} /> WhatsApp
                      </button>
                    )}
                  </div>

                  <div style={{ ...card, padding: '14px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>🪙 Binance Pay</strong>
                    {row('Pay ID', data.binancePayId)}
                    <div style={{ marginTop: '8px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#9a3412' }}>POR LIQUIDAR</span>
                        <strong style={{ color: '#c2410c' }}>${data.pendingBalanceUSD.toFixed(2)} USD</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#9a3412' }}>Tasa Bs. {rate.toFixed(2)}</span>
                        <span>
                          <strong style={{ color: '#ea580c' }}>Bs. {fmtBs(pendingBs)}</strong>
                          <button type="button" style={copyBtn} onClick={() => copy(pendingBs.toFixed(2), 'Monto Bs.')}>
                            <IonIcon icon={copyOutline} style={{ fontSize: '15px' }} />
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones de liquidación */}
                {pending.length > 0 && mode === 'NONE' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <IonButton color="success" style={{ fontWeight: 800 }} onClick={() => setMode('BULK')}>
                      ⚡ {selected.length > 0 ? `Liquidar selección (${selected.length})` : `Liquidar todo ($${data.pendingBalanceUSD.toFixed(2)})`}
                    </IonButton>
                    {selected.length > 0 && (
                      <IonButton fill="outline" color="medium" onClick={() => setSelected([])}>
                        Limpiar selección
                      </IonButton>
                    )}
                  </div>
                )}

                {mode === 'BULK' && (
                  <div style={{ ...card, border: '2px solid #16a34a', background: '#f0fdf4', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                      Liquidar {target.length} comisión(es): ${targetUSD.toFixed(2)} USD ≈ Bs. {fmtBs(targetUSD * rate)}
                      <button type="button" style={copyBtn} onClick={() => copy((targetUSD * rate).toFixed(2), 'Monto Bs.')}>
                        <IonIcon icon={copyOutline} style={{ fontSize: '15px' }} />
                      </button>
                    </div>
                    <IonItem lines="full" style={{ marginBottom: '8px' }}>
                      <IonLabel position="stacked">Método</IonLabel>
                      <IonSelect value={method} onIonChange={(e) => setMethod(e.detail.value)}>
                        <IonSelectOption value="PAGO_MOVIL">Pago Móvil (Bs.)</IonSelectOption>
                        <IonSelectOption value="BINANCE">Binance Pay (USDT)</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                    <IonItem lines="full" style={{ marginBottom: '12px' }}>
                      <IonLabel position="stacked">Referencia / comprobante *</IonLabel>
                      <IonInput value={reference} placeholder="Ej: 09876543" onIonInput={(e) => setReference(e.detail.value || '')} />
                    </IonItem>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <IonButton fill="outline" color="medium" style={{ flex: 1 }} onClick={() => { setMode('NONE'); setReference(''); }}>
                        Cancelar
                      </IonButton>
                      <IonButton color="success" style={{ flex: 2, fontWeight: 800 }} disabled={busy || !reference.trim()} onClick={payBulk}>
                        {busy ? <IonSpinner name="dots" /> : 'Confirmar pago'}
                      </IonButton>
                    </div>
                  </div>
                )}

                {/* Tabla comisiones */}
                <div style={{ ...card, overflowX: 'auto' }}>
                  {data.commissions.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>Sin comisiones generadas.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '720px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', width: '36px' }}>
                            <input
                              type="checkbox"
                              checked={pending.length > 0 && selected.length === pending.length}
                              onChange={(e) => setSelected(e.target.checked ? pending.map((c) => c.id) : [])}
                            />
                          </th>
                          <th style={{ padding: '10px 12px' }}>Comercio</th>
                          <th style={{ padding: '10px 12px' }}>Tipo</th>
                          <th style={{ padding: '10px 12px' }}>USD / Bs.</th>
                          <th style={{ padding: '10px 12px' }}>Fecha</th>
                          <th style={{ padding: '10px 12px' }}>Estado</th>
                          <th style={{ padding: '10px 12px' }}>Referencia</th>
                          <th style={{ padding: '10px 12px' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {data.commissions.map((c) => {
                          const isPending = c.status === PromoterCommissionStatus.PENDING;
                          return (
                            <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px' }}>
                                {isPending && (
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(c.id)}
                                    onChange={(e) =>
                                      setSelected((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((i) => i !== c.id)))
                                    }
                                  />
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                                {c.tenantName || 'Comercio vinculado'}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700 }}>
                                {c.type === PromoterCommissionType.ACTIVATION ? '⭐ Activación' : '🔄 Recurrente'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <strong>${c.amountUSD.toFixed(2)}</strong>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Bs. {fmtBs(c.amountUSD * rate)}</div>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                                {new Date(c.createdAt).toLocaleDateString('es-VE')}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {c.status === PromoterCommissionStatus.PAID ? (
                                  <IonBadge color="success">PAGADA</IonBadge>
                                ) : isPending ? (
                                  <IonBadge color="warning">PENDIENTE</IonBadge>
                                ) : (
                                  <IonBadge color="medium">{c.status}</IonBadge>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>
                                {c.paymentReference || '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                {isPending ? (
                                  <IonButton
                                    size="small"
                                    color="success"
                                    onClick={() => { setSelected([c.id]); setMode('BULK'); }}
                                  >
                                    Pagar
                                  </IonButton>
                                ) : (
                                  <button
                                    type="button"
                                    title="Comprobante por WhatsApp"
                                    style={{ ...copyBtn, color: '#15803d' }}
                                    onClick={() =>
                                      sendReceipt(
                                        data,
                                        [c],
                                        c.paymentReference || 'Liquidado',
                                        c.paymentReference?.includes('Binance') ? 'BINANCE' : 'PAGO_MOVIL',
                                      )
                                    }
                                  >
                                    <IonIcon icon={logoWhatsapp} style={{ fontSize: '18px' }} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {tab === 'affiliates' && (
              <div style={{ ...card, overflowX: 'auto' }}>
                {(data.affiliatedTenants || []).length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                    Aún no hay comercios con el código <strong>{data.code}</strong>.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>Comercio</th>
                        <th style={{ padding: '10px 12px' }}>Dueño</th>
                        <th style={{ padding: '10px 12px' }}>Plan</th>
                        <th style={{ padding: '10px 12px' }}>Estado</th>
                        <th style={{ padding: '10px 12px' }}>Registro</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Generado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.affiliatedTenants || []).map((a) => (
                        <tr key={a.tenantId} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800 }}>{a.tenantName}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {a.ownerName || '—'}
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{a.ownerEmail || ''}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{a.planType}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <IonBadge
                              color={a.subStatus === 'ACTIVE' ? 'success' : a.subStatus === 'TRIAL' ? 'warning' : a.subStatus === 'PAST_DUE' ? 'danger' : 'medium'}
                            >
                              {a.subStatusLabel}
                            </IonBadge>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                            {new Date(a.createdAt).toLocaleDateString('es-VE')}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                            ${(a.totalCommissionsUSD || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};
