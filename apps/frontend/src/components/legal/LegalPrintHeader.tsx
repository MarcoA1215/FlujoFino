import React, { useState, useEffect } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { printOutline, shieldCheckmarkOutline } from 'ionicons/icons';

interface LegalPrintHeaderProps {
  title: string;
  version?: string;
  lastUpdated?: string;
  referenceCode?: string;
  precedenceUrl?: string;
}

export const LegalPrintHeader: React.FC<LegalPrintHeaderProps> = ({
  title,
  version = '2.0',
  lastUpdated = 'Noviembre 2026',
  referenceCode = 'FW-LEGAL-V2.0-SENIAT-SECURE',
  precedenceUrl = '/terms',
}) => {
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setCurrentTimestamp(
      now.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' +
      now.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }, []);

  const handlePrint = () => {
    // Refresh timestamp right before printing/saving to PDF
    const now = new Date();
    setCurrentTimestamp(
      now.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' +
      now.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
    window.print();
  };

  return (
    <>
      {/* 1. VISIBLE EN PANTALLA: Barra de Acción de Descarga / Impresión */}
      <div
        className="ff-no-print"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              fontSize: '20px',
            }}
          >
            <IonIcon icon={shieldCheckmarkOutline} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              Versión Oficial Vigente: {version} ({lastUpdated})
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Documento con validez legal referencial y salvaguardas fiscales
            </div>
          </div>
        </div>

        <IonButton
          fill="outline"
          onClick={handlePrint}
          style={{
            '--color': '#0f172a',
            '--border-color': '#cbd5e1',
            '--border-radius': '10px',
            fontWeight: 700,
            fontSize: '13px',
            height: '38px',
            margin: 0,
          } as any}
        >
          <IonIcon slot="start" icon={printOutline} />
          Descargar PDF / Imprimir
        </IonButton>
      </div>

      {/* 2. EXCLUSIVO PARA IMPRESIÓN / GUARDAR COMO PDF: Encabezado Membretado Oficial */}
      <div
        className="ff-print-header"
        style={{
          borderBottom: '2px solid #0f172a',
          paddingBottom: '16px',
          marginBottom: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
              FINOWORK SAAS
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plataforma de Gestión Comercial y Punto de Venta
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Titular: Marco David Avila Pinto • C.I. V-31.075.846
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
            <div><strong>Versión Documento:</strong> {version}</div>
            <div><strong>Última Revisión:</strong> {lastUpdated}</div>
            <div><strong>Fecha de Emisión:</strong> {currentTimestamp}</div>
            <div><strong>Código de Control:</strong> {referenceCode}</div>
          </div>
        </div>

        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '14px 0 6px 0', textAlign: 'center' }}>
          {title}
        </h1>

        {/* CLÁUSULA DE PREVALENCIA LEGAL (Protección jurídica contra disputas por cambios futuros) */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '10px 14px',
            marginTop: '12px',
            fontSize: '10.5px',
            lineHeight: '1.45',
            color: '#334155',
          }}
        >
          <strong>AVISO DE VALIDEZ Y PREVALENCIA LEGAL:</strong> El presente documento descargado o impreso certifica las condiciones contractuales y términos de servicio vigentes al momento exacto de su expedición ({currentTimestamp}). De conformidad con lo estipulado en este acuerdo, FinoWork se reserva el derecho de actualizar sus términos y políticas para reflejar mejoras operativas o adecuar su funcionamiento a la normativa tributaria y legal aplicable (incluyendo directrices del SENIAT). La versión más reciente y legalmente vinculante estará siempre publicada y accesible en tiempo real en{' '}
          <strong>https://finowork.com{precedenceUrl}</strong>, la cual prevalecerá legalmente ante cualquier discrepancia o modificación posterior con respecto a copias impresas o archivos digitales descargados con anterioridad.
        </div>
      </div>
    </>
  );
};
