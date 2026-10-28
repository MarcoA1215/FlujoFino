import React, { useRef } from 'react';
import {
  IonModal,
  useIonToast
} from '@ionic/react';
import type { FiscalInvoiceDTO } from '@finowork/shared-types';

interface FiscalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FiscalInvoiceDTO | null;
  settings?: any;
}

export const FiscalReceiptModal: React.FC<FiscalReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
}) => {
  const [presentToast] = useIonToast();
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const companyName = settings?.fiscalCompanyName || 'EMPRESA COMERCIAL C.A.';
  const companyRif = settings?.fiscalRif || 'J-00000000-0';
  const companyAddress = settings?.fiscalAddress || 'Venezuela';
  const companyPhone = settings?.fiscalPhone || '';

  const rate = Number(invoice.exchangeRate || settings?.exchangeRateBs || 1);
  const totalBs = Number(invoice.amountBs || (invoice.totalAmount * rate)).toFixed(2);
  const exemptBs = Number((invoice.subtotalExempt || 0) * rate).toFixed(2);
  const baseBs = Number((invoice.taxableBase || 0) * rate).toFixed(2);
  const ivaBs = Number((invoice.taxAmount || 0) * rate).toFixed(2);

  const qrData = invoice.qrCodeUrl?.startsWith('http')
    ? invoice.qrCodeUrl
    : `RIF:${companyRif}|DOC:${invoice.invoiceNumber}|CTRL:${invoice.fiscalControlNumber || '00-00000000'}|FECHA:${new Date(invoice.createdAt).toISOString()}|TOTAL:${totalBs}|IVA:${ivaBs}`;

  const qrImageSrc = invoice.qrCodeUrl?.startsWith('http')
    ? invoice.qrCodeUrl
    : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const lines = [
      `🧾 TICKET DE VENTA Y ENTREGA - ${companyName}`,
      `RIF: ${companyRif}`,
      `N° Comprobante / Ticket: ${invoice.invoiceNumber}`,
      `N° Control Int.: ${invoice.fiscalControlNumber || 'N/A'}`,
      `Fecha: ${new Date(invoice.createdAt).toLocaleString('es-VE')}`,
      `Cliente: ${invoice.customerName} (${invoice.customerRif})`,
      '--------------------------------',
      ...(invoice.items || []).map(
        it => `${it.quantity}x ${it.name} - $${(it.subtotal || it.unitPrice * it.quantity).toFixed(2)} ${it.isTaxExempt || it.isExempt ? '(E)' : '(G 16%)'}`
      ),
      '--------------------------------',
      `Exento: $${(invoice.subtotalExempt || 0).toFixed(2)} (Bs. ${exemptBs})`,
      `Base Imponible (16%): $${(invoice.taxableBase || 0).toFixed(2)} (Bs. ${baseBs})`,
      `IVA (16%): $${(invoice.taxAmount || 0).toFixed(2)} (Bs. ${ivaBs})`,
      `TOTAL: $${invoice.totalAmount.toFixed(2)} USD`,
      `TOTAL BS (BCV): Bs. ${totalBs}`,
      `Tasa BCV: Bs. ${rate.toFixed(2)}`,
      '--------------------------------',
      'Documento de control administrativo interno y entrega al cliente.',
      'NO VÁLIDO COMO FACTURA FISCAL • NO REEMPLAZA MÁQUINAS FISCALES'
    ];
    navigator.clipboard?.writeText(lines.join('\n'));
    presentToast({
      message: 'Ticket copiado al portapapeles',
      duration: 2500,
      color: 'success'
    });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} style={{ '--border-radius': '16px' } as any}>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #fiscal-receipt-print-area, #fiscal-receipt-print-area * {
              visibility: visible !important;
            }
            #fiscal-receipt-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
              padding: 4mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 11px !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div style={{ background: '#F8FAFC', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header no-print */}
        <div className="no-print" style={{ padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🧾</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#0F172A' }}>Ticket de Venta y Entrega</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Control administrativo interno y entrega al cliente (No válido como factura fiscal)</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              fontWeight: '700'
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', justifyContent: 'center' }}>
          {/* Printable Ticket */}
          <div
            id="fiscal-receipt-print-area"
            ref={printRef}
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px 20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              fontFamily: 'monospace, Courier, sans-serif',
              color: '#0F172A',
              fontSize: '12px',
              lineHeight: '1.4'
            }}
          >
            {/* Membrete Emisor */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: '800', fontSize: '15px', color: '#0F172A', textTransform: 'uppercase' }}>
                {companyName}
              </div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#1E293B' }}>
                RIF: {companyRif}
              </div>
              {companyAddress && (
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  {companyAddress}
                </div>
              )}
              {companyPhone && (
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  TELF: {companyPhone}
                </div>
              )}
            </div>

            {/* Separador */}
            <div style={{ borderBottom: '1px dashed #CBD5E1', margin: '10px 0' }} />

            {/* Datos del Documento */}
            {(() => {
              const isCreditNote = invoice.documentType === 'CREDIT_NOTE';
              const docTitle = isCreditNote
                ? 'NOTA DE AJUSTE / CRÉDITO INTERNA'
                : 'TICKET DE VENTA Y ENTREGA';
              const numLabel = isCreditNote ? 'N° NOTA CRÉDITO:' : 'N° TICKET / COMPROBANTE:';

              return (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ textAlign: 'center', fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px' }}>
                    {docTitle}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '10px', color: '#475569', marginTop: '2px', fontWeight: '700' }}>
                    CONTROL ADMINISTRATIVO INTERNO • ENTREGA AL CLIENTE
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '8.5px', color: '#DC2626', marginTop: '2px', fontWeight: '800', letterSpacing: '0.3px' }}>
                    *** NO VÁLIDO COMO FACTURA FISCAL • NO REEMPLAZA MÁQUINA FISCAL ***
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontWeight: '700' }}>{numLabel}</span>
                    <span style={{ fontWeight: '800', color: '#047857' }}>{invoice.invoiceNumber}</span>
                  </div>
                  {invoice.fiscalControlNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontWeight: '700' }}>N° CONTROL INT.:</span>
                      <span style={{ fontWeight: '800' }}>{invoice.fiscalControlNumber}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span>FECHA:</span>
                    <span>{new Date(invoice.createdAt).toLocaleDateString('es-VE')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span>HORA:</span>
                    <span>{new Date(invoice.createdAt).toLocaleTimeString('es-VE')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Separador */}
            <div style={{ borderBottom: '1px dashed #CBD5E1', margin: '10px 0' }} />

            {/* Datos del Receptor / Cliente */}
            <div style={{ marginBottom: '12px' }}>
              <div><span style={{ fontWeight: '700' }}>RAZÓN SOCIAL / NOMBRE:</span></div>
              <div style={{ textTransform: 'uppercase', marginBottom: '2px' }}>{invoice.customerName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700' }}>C.I. / R.I.F.:</span>
                <span>{invoice.customerRif}</span>
              </div>
              {invoice.customerAddress && (
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  DIR: {invoice.customerAddress}
                </div>
              )}
            </div>

            {/* Separador */}
            <div style={{ borderBottom: '1px solid #0F172A', margin: '10px 0' }} />

            {/* Encabezado de Productos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '6px' }}>
              <span style={{ width: '40px' }}>CANT</span>
              <span style={{ flex: 1, textAlign: 'left', paddingLeft: '4px' }}>DESCRIPCIÓN</span>
              <span style={{ width: '65px', textAlign: 'right' }}>TOTAL $</span>
            </div>

            {/* Ítems */}
            <div style={{ marginBottom: '12px' }}>
              {(invoice.items || []).map((it, idx) => {
                const itemTotal = Number(it.subtotal || it.unitPrice * it.quantity).toFixed(2);
                return (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ width: '40px' }}>{it.quantity}x</span>
                      <span style={{ flex: 1, paddingLeft: '4px', textTransform: 'uppercase' }}>
                        {it.name} {it.isTaxExempt || it.isExempt ? '(E)' : '(G 16%)'}
                      </span>
                      <span style={{ width: '65px', textAlign: 'right', fontWeight: '700' }}>
                        ${itemTotal}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', paddingLeft: '40px' }}>
                      @ ${Number(it.unitPrice).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Separador */}
            <div style={{ borderBottom: '1px dashed #CBD5E1', margin: '10px 0' }} />

            {/* Desglose Tributario SENIAT */}
            <div style={{ marginBottom: '14px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>SUBTOTAL EXENTO (E):</span>
                <span>${(invoice.subtotalExempt || 0).toFixed(2)} (Bs. {exemptBs})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>BASE IMPONIBLE (G 16%):</span>
                <span>${(invoice.taxableBase || 0).toFixed(2)} (Bs. {baseBs})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>TOTAL IVA (16%):</span>
                <span>${(invoice.taxAmount || 0).toFixed(2)} (Bs. {ivaBs})</span>
              </div>
            </div>

            {/* Gran Total */}
            <div style={{ backgroundColor: '#F1F5F9', padding: '10px', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                <span>TOTAL A PAGAR:</span>
                <span>${invoice.totalAmount.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: '#047857', marginTop: '4px' }}>
                <span>TOTAL EN BS:</span>
                <span>Bs. {totalBs}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', textAlign: 'right', marginTop: '2px' }}>
                Tasa Oficial BCV: Bs. {rate.toFixed(2)} / USD
              </div>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', margin: '14px 0 10px 0' }}>
              <img
                src={qrImageSrc}
                alt="QR Comprobante"
                style={{ width: '130px', height: '130px', margin: '0 auto', display: 'block', border: '1px solid #E2E8F0', padding: '4px', borderRadius: '6px' }}
              />
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                Verificación de Datos del Comprobante
              </div>
            </div>

            {/* Pie Legal / Disclaimer No Fiscal */}
            <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#475569', borderTop: '1px dashed #CBD5E1', paddingTop: '10px' }}>
              <div style={{ fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                COMPROBANTE PARA CONTROL ADMINISTRATIVO INTERNO
              </div>
              <div style={{ fontSize: '9px', color: '#DC2626', fontWeight: '800', marginTop: '2px' }}>
                *** NO VÁLIDO COMO FACTURA FISCAL ***
              </div>
              <div style={{ fontSize: '8.5px', color: '#64748B', marginTop: '3px', lineHeight: '1.3' }}>
                Documento emitido exclusivamente para control comercial interno y constancia de entrega al cliente. No sustituye la factura fiscal formal ni reemplaza el uso de máquinas fiscales o imprentas autorizadas por el SENIAT.
              </div>
              <div style={{ marginTop: '6px', fontWeight: '800', color: '#0F172A' }}>¡GRACIAS POR SU COMPRA!</div>
            </div>
          </div>
        </div>

        {/* Footer Actions (no-print) */}
        <div className="no-print" style={{ padding: '16px 20px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyText}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📋 Copiar Detalle
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--theme-primary, #10B981)',
              color: 'var(--theme-primary-contrast, #ffffff)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            🖨️ Imprimir Comprobante
          </button>
        </div>
      </div>
    </IonModal>
  );
};
export default FiscalReceiptModal;
