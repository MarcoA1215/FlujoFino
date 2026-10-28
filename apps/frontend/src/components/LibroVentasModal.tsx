import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonSpinner,
  useIonToast
} from '@ionic/react';
import { apiClient } from '../api/client';

interface LibroVentasModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
}

export const LibroVentasModal: React.FC<LibroVentasModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [presentToast] = useIonToast();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const companyName = settings?.fiscalCompanyName || 'EMPRESA COMERCIAL C.A.';
  const companyRif = settings?.fiscalRif || 'J-00000000-0';

  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const fetchLibroVentas = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/fiscal/libro-ventas', {
        params: {
          year: selectedYear,
          month: selectedMonth,
        },
      });
      setReportData(res.data);
    } catch (err: any) {
      console.error('Error cargando Libro de Ventas:', err);
      presentToast({
        message: 'Error al consultar el Libro de Ventas: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLibroVentas();
    }
  }, [isOpen, selectedYear, selectedMonth]);

  const filteredFilas = (reportData?.filas || []).filter((f: any) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (f.numeroFactura || '').toLowerCase().includes(q) ||
      (f.numeroControl || '').toLowerCase().includes(q) ||
      (f.rifCliente || '').toLowerCase().includes(q) ||
      (f.nombreCliente || '').toLowerCase().includes(q)
    );
  });

  const formatBs = (val: number) => {
    return Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Exportar a Excel (.xls)
  const handleExportExcel = () => {
    if (!reportData || !reportData.filas) return;

    const escapeHtml = (str: any) =>
      String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rows = reportData.filas;
    const resumen = reportData.resumen || {};

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
          th { background-color: #047857; color: #FFFFFF; font-weight: bold; padding: 6px 8px; border: 1px solid #CBD5E1; text-align: center; }
          td { padding: 5px 8px; border: 1px solid #E2E8F0; }
          .num { text-align: right; }
          .tot { background-color: #ECFDF5; font-weight: bold; border-top: 2px solid #047857; }
        </style>
      </head>
        <h2>LIBRO DE VENTAS - CONTROL ADMINISTRATIVO INTERNO (Borrador de Conciliación)</h2>
        <p style="font-size: 10px; color: #555;">Documento de apoyo para conciliación contable interna. No sustituye la declaración formal ni los libros fiscales timbrados.</p>
        <p><b>Razón Social:</b> ${escapeHtml(companyName)} | <b>RIF:</b> ${escapeHtml(companyRif)} | <b>Período:</b> ${escapeHtml(reportData.periodo)}</p>
        <table>
          <thead>
            <tr>
              <th>N° Op.</th>
              <th>Fecha</th>
              <th>RIF / Cédula</th>
              <th>Nombre o Razón Social</th>
              <th>Tipo Doc.</th>
              <th>N° Factura</th>
              <th>N° Control</th>
              <th>N° Fact. Afectada</th>
              <th>Total Ventas Inc. IVA (Bs.)</th>
              <th>Ventas Exentas (Bs.)</th>
              <th>Base Imponible (Bs.)</th>
              <th>% Alíc.</th>
              <th>Impuesto IVA (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r: any) => `
              <tr>
                <td style="text-align: center;">${r.operacionNumero}</td>
                <td>${escapeHtml(r.fecha)}</td>
                <td>${escapeHtml(r.rifCliente)}</td>
                <td>${escapeHtml(r.nombreCliente)}</td>
                <td style="text-align: center;">${escapeHtml(r.tipoDocumento)}</td>
                <td style="text-align: center;">${escapeHtml(r.numeroFactura)}</td>
                <td style="text-align: center;">${escapeHtml(r.numeroControl)}</td>
                <td style="text-align: center;">${escapeHtml(r.numeroFacturaAfectada)}</td>
                <td class="num">${Number(r.totalVentasConIvaBs || 0).toFixed(2)}</td>
                <td class="num">${Number(r.ventasExentasBs || 0).toFixed(2)}</td>
                <td class="num">${Number(r.baseImponibleBs || 0).toFixed(2)}</td>
                <td style="text-align: center;">${r.alicuotaIva}%</td>
                <td class="num">${Number(r.impuestoIvaBs || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="tot">
              <td colspan="8" style="text-align: right; font-weight: bold;">TOTALES GENERALES DEL PERÍODO:</td>
              <td class="num">${Number(resumen.totalVentasConIvaBs || 0).toFixed(2)}</td>
              <td class="num">${Number(resumen.totalExentoBs || 0).toFixed(2)}</td>
              <td class="num">${Number(resumen.totalBaseImponibleBs || 0).toFixed(2)}</td>
              <td></td>
              <td class="num">${Number(resumen.totalIvaBs || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Libro_Ventas_SENIAT_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    presentToast({ message: 'Libro de Ventas descargado en Excel (.xls)', duration: 2500, color: 'success' });
  };

  // Exportar a CSV (.csv) con BOM UTF-8
  const handleExportCSV = () => {
    if (!reportData || !reportData.filas) return;

    const headers = [
      'Nro Operacion',
      'Fecha',
      'RIF Cliente',
      'Nombre Cliente',
      'Tipo Doc',
      'Nro Factura',
      'Nro Control',
      'Factura Afectada',
      'Total Ventas con IVA (Bs)',
      'Ventas Exentas (Bs)',
      'Base Imponible (Bs)',
      'Alicuota IVA (%)',
      'Impuesto IVA (Bs)'
    ];

    const escapeCsv = (val: any) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines = [
      headers.join(';'),
      ...reportData.filas.map((r: any) => [
        r.operacionNumero,
        escapeCsv(r.fecha),
        escapeCsv(r.rifCliente),
        escapeCsv(r.nombreCliente),
        escapeCsv(r.tipoDocumento),
        escapeCsv(r.numeroFactura),
        escapeCsv(r.numeroControl),
        escapeCsv(r.numeroFacturaAfectada),
        Number(r.totalVentasConIvaBs || 0).toFixed(2),
        Number(r.ventasExentasBs || 0).toFixed(2),
        Number(r.baseImponibleBs || 0).toFixed(2),
        r.alicuotaIva,
        Number(r.impuestoIvaBs || 0).toFixed(2),
      ].join(';'))
    ];

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Libro_Ventas_SENIAT_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    presentToast({ message: 'Libro de Ventas descargado en CSV', duration: 2500, color: 'success' });
  };

  const handlePrint = () => {
    window.print();
  };

  const resumen = reportData?.resumen || {};

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} style={{ '--border-radius': '16px' } as any}>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #libro-ventas-print-area, #libro-ventas-print-area * {
              visibility: visible !important;
            }
            #libro-ventas-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              color: #000000 !important;
              padding: 10px !important;
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
            <span style={{ fontSize: '22px' }}>📊</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A' }}>Libro de Ventas (Control de IVA)</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Reporte y borrador de apoyo para conciliación contable</div>
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

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Disclaimer / Aviso de Apoyo Contable (no-print) */}
          <div className="no-print" style={{ padding: '10px 14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '12px', marginBottom: '14px', lineHeight: '1.4' }}>
            💡 <b>Control Administrativo y Apoyo Contable:</b> Este módulo calcula y totaliza las ventas exentas, bases gravadas e IVA para facilitar la labor de su contador. Es un borrador de apoyo interno y no sustituye los libros fiscales oficiales ni la facturación por imprenta o máquina autorizada por el SENIAT.
          </div>

          <div id="libro-ventas-print-area">
            {/* Membrete del Reporte */}
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A' }}>{companyName}</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>RIF: <b>{companyRif}</b></div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Registro Administrativo de Ventas e Ingresos (Borrador de IVA)
                  </div>
                </div>

                {/* Filtros de Mes y Año (no-print) */}
                <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0F172A'
                    }}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0F172A'
                    }}
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={fetchLibroVentas}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#047857',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {loading ? 'Cargando...' : 'Consultar'}
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <IonSpinner name="crescent" color="primary" />
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>Calculando Libro de Ventas...</div>
              </div>
            ) : (
              <>
                {/* Métricas Resumen */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Total Ventas con IVA</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
                      Bs. {formatBs(resumen.totalVentasConIvaBs)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>
                      {resumen.totalDocumentos || 0} docs emitidos
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Ventas Exentas (E)</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284C7', marginTop: '4px' }}>
                      Bs. {formatBs(resumen.totalExentoBs)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Tasa 0% IVA
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Base Imponible Gravable</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#D97706', marginTop: '4px' }}>
                      Bs. {formatBs(resumen.totalBaseImponibleBs)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Sujeto a alícuota 16%
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Débito Fiscal (IVA 16%)</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#DC2626', marginTop: '4px' }}>
                      Bs. {formatBs(resumen.totalIvaBs)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      A enterar ante SENIAT
                    </div>
                  </div>
                </div>

                {/* Buscador interno (no-print) */}
                <div className="no-print" style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por N° Factura, Control, RIF o Nombre..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      color: '#0F172A'
                    }}
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      style={{ padding: '8px 12px', border: '1px solid #CBD5E1', background: '#F1F5F9', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Tabla de Registros */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '900px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700', width: '50px' }}>N°</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Fecha</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>RIF / CI</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Razón Social / Cliente</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Tipo</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>N° Factura</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>N° Control</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Total Ventas Bs</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Exento Bs</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Base Bs</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>%</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>IVA Bs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFilas.length === 0 ? (
                        <tr>
                          <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                            No hay facturas fiscales registradas para el período seleccionado ({selectedMonth}/{selectedYear}).
                          </td>
                        </tr>
                      ) : (
                        filteredFilas.map((r: any) => (
                          <tr key={r.operacionNumero} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', color: '#64748B', fontWeight: '600' }}>{r.operacionNumero}</td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>{r.fecha}</td>
                            <td style={{ padding: '8px 12px', color: '#0F172A', fontWeight: '600' }}>{r.rifCliente}</td>
                            <td style={{ padding: '8px 12px', color: '#0F172A', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.nombreCliente}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: r.tipoDocumento === '02-NC' ? '#FEF2F2' : '#ECFDF5',
                                color: r.tipoDocumento === '02-NC' ? '#DC2626' : '#047857'
                              }}>
                                {r.tipoDocumento}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '700', color: '#0F172A' }}>{r.numeroFactura}</td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>{r.numeroControl}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#0F172A' }}>
                              {formatBs(r.totalVentasConIvaBs)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0284C7' }}>
                              {formatBs(r.ventasExentasBs)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#D97706' }}>
                              {formatBs(r.baseImponibleBs)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B' }}>
                              {r.alicuotaIva}%
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#DC2626' }}>
                              {formatBs(r.impuestoIvaBs)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredFilas.length > 0 && (
                      <tfoot>
                        <tr style={{ background: '#ECFDF5', borderTop: '2px solid #10B981', fontWeight: '800' }}>
                          <td colSpan={7} style={{ padding: '10px 12px', textAlign: 'right', color: '#065F46' }}>
                            TOTALES DEL PERÍODO:
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#065F46' }}>
                            {formatBs(resumen.totalVentasConIvaBs)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284C7' }}>
                            {formatBs(resumen.totalExentoBs)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#D97706' }}>
                            {formatBs(resumen.totalBaseImponibleBs)}
                          </td>
                          <td></td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#DC2626' }}>
                            {formatBs(resumen.totalIvaBs)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions (no-print) */}
        <div className="no-print" style={{ padding: '14px 20px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrint}
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
            🖨️ Imprimir
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
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
            📄 Descargar CSV
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
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
            📥 Descargar Excel (.xls)
          </button>
        </div>
      </div>
    </IonModal>
  );
};
export default LibroVentasModal;
