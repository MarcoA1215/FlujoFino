import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react';
import {
  closeOutline,
  informationCircleOutline,
  calculatorOutline,
  bulbOutline,
  checkmarkCircleOutline,
  trendingUpOutline,
  trendingDownOutline,
  walletOutline,
  cartOutline,
  alertCircleOutline,
  cardOutline,
  swapHorizontalOutline,
  pieChartOutline,
  calendarOutline,
} from 'ionicons/icons';
import type { DashboardSummary, MonthlySummary } from '../types';

export type MetricKey =
  | 'treasury_cash'
  | 'treasury_cash_bs'
  | 'treasury_banks'
  | 'treasury_digital'
  | 'treasury_cop'
  | 'treasury_bank_cop'
  | 'monthly_invoiced'
  | 'monthly_collected'
  | 'monthly_pending'
  | 'monthly_expenses'
  | 'monthly_profit'
  | 'monthly_by_method'
  | 'monthly_unpaid_bookings'
  | 'historical_revenue'
  | 'historical_profit'
  | 'historical_investment'
  | 'historical_losses'
  | 'sales_chart'
  | 'top_products'
  | 'inventory_low_materials'
  | 'inventory_low_products';

export interface MetricDefinition {
  key: MetricKey;
  title: string;
  category: string;
  icon: string;
  accentColor: string;
  accentBg: string;
  shortSummary: string;
  whatItMeans: string;
  formula: string;
  formulaTerms: { term: string; explanation: string; operation?: '+' | '-' | '=' | 'info' }[];
  dataSources: string[];
  example: string;
  financialTip: string;
  renderLiveCalculation?: (summary: DashboardSummary | null, monthlyData: MonthlySummary | null) => React.ReactNode;
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  treasury_cash: {
    key: 'treasury_cash',
    title: 'Gaveta Física (Efectivo USD)',
    category: 'Tesorería y Fondos Reales',
    icon: walletOutline,
    accentColor: '#047857',
    accentBg: '#ECFDF5',
    shortSummary: 'Billetes reales en dólares que deben estar físicamente en la gaveta o caja fuerte.',
    whatItMeans:
      'Representa el arqueo de efectivo en dólares contantes y sonantes. No depende de las fluctuaciones de la tasa de cambio en bolívares, ya que son billetes tangibles recibidos y entregados.',
    formula:
      'Gaveta USD = Saldo Inicial + Fondo de Caja USD + Cobros en Efectivo USD - Vueltos Entregados USD - Gastos en Efectivo USD + Compras de Divisas (Efectivo)',
    formulaTerms: [
      { term: 'Saldo Inicial Efectivo', explanation: 'Base de dinero que declaraste tener al arrancar o configurar la tesorería.', operation: '+' },
      { term: 'Fondo de Caja USD', explanation: 'Aportes de sencillo/liquidez agregados para dar cambio.', operation: '+' },
      { term: 'Cobros Efectivo USD', explanation: 'Dinero recibido de clientes en ventas POS o abonos en billetes.', operation: '+' },
      { term: 'Compras de USD', explanation: 'Bolívares de tus ventas convertidos a efectivo físico mediante "Comprar USD".', operation: '+' },
      { term: 'Vueltos Entregados USD', explanation: 'Cambio entregado a clientes en billetes.', operation: '-' },
      { term: 'Gastos en Efectivo USD', explanation: 'Compras a proveedores o gastos operativos pagados con billetes de la caja.', operation: '-' },
    ],
    dataSources: [
      'Órdenes POS pagadas en método Efectivo / Cash USD.',
      'Abonos recibidos en efectivo en pedidos por encargo o citas.',
      'Módulo de Gastos Operativos cuya forma de pago sea "Efectivo / Cash USD".',
      'Vueltos registrados en órdenes de venta.',
      'Operaciones registradas en "Comprar USD / Proteger Bs".',
    ],
    example:
      'Si abriste la caja con $50, cobraste $200 en ventas en efectivo, diste $20 en vueltos y pagaste un flete de $10 en efectivo, tu gaveta física debe tener exactamente: 50 + 200 - 20 - 10 = $220.00.',
    financialTip:
      'Si este número aparece en rojo/negativo, significa que se registraron más salidas en efectivo de las que ingresaron. Haz clic en "Saldo Inicial" para ajustar el fondo real de apertura de tu negocio.',
    renderLiveCalculation: (summary) => {
      const t = summary?.treasury;
      if (!t) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
            <span>(+) Saldo Inicial Efectivo:</span>
            <strong>${Number(t.initialCashUSD || 0).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
            <span>(+) Compras de USD acumuladas:</span>
            <strong>${Number(t.totalExchangedUSD || 0).toFixed(2)}</strong>
          </div>
          <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: (t.cashUSD || 0) < 0 ? '#DC2626' : '#047857', fontSize: '14px' }}>
            <span>(=) Efectivo Total en Gaveta:</span>
            <span>${Number(t.cashUSD || 0).toFixed(2)}</span>
          </div>
        </div>
      );
    },
  },

  treasury_cash_bs: {
    key: 'treasury_cash_bs',
    title: 'Gaveta Física (Efectivo Bs.)',
    category: 'Tesorería y Fondos Reales',
    icon: walletOutline,
    accentColor: '#059669',
    accentBg: '#ECFDF5',
    shortSummary: 'Billetes reales en bolívares en caja para dar vueltos o gastos menores.',
    whatItMeans:
      'Representa el arqueo de billetes físicos en Bolívares que tienes en gaveta. Es vital para dar vuelto a clientes que pagan en bolívares o en divisas cuando se requiere redondear en moneda local.',
    formula:
      'Gaveta Bs. = Saldo Inicial Bs + Cobros en Efectivo Bs - Vueltos Entregados en Efectivo Bs - Gastos en Efectivo Bs\nEquivalente USD = Saldo Gaveta Bs ÷ Tasa de Cambio',
    formulaTerms: [
      { term: 'Saldo Inicial Gaveta Bs', explanation: 'Monto con el que abriste la gaveta en bolívares.', operation: '+' },
      { term: 'Cobros Efectivo Bs', explanation: 'Billetes de bolívares recibidos en ventas de mostrador o abonos.', operation: '+' },
      { term: 'Vueltos en Efectivo Bs', explanation: 'Billetes entregados como cambio a los clientes.', operation: '-' },
      { term: 'Gastos Menores en Efectivo Bs', explanation: 'Compras o pagos menores pagados en billetes de bolívares.', operation: '-' },
    ],
    dataSources: [
      'Ventas POS con método de pago Efectivo Bolívares (CASH_BS).',
      'Vueltos entregados en bolívares en efectivo.',
      'Saldo inicial de gaveta en Bs. configurado en Tesorería.',
    ],
    example:
      'Si abriste con Bs. 500 iniciales y cobraste Bs. 1.200 en ventas en efectivo Bs, tu gaveta física debe tener Bs. 1.700 en billetes.',
    financialTip:
      'No dejes acumular demasiado efectivo en bolívares para evitar pérdida de valor por inflación; utiliza "Comprar USD / Proteger Bs" para resguardar excedentes.',
    renderLiveCalculation: (summary) => {
      const t = summary?.treasury;
      if (!t) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
            <span>(+) Saldo Inicial Efectivo Bs:</span>
            <strong>{t.currencySymbol} {Number(t.initialCashBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>Tasa de Cambio del Sistema:</span>
            <strong>{Number(t.exchangeRate || 0).toFixed(2)} {t.currencySymbol} / USD</strong>
          </div>
          <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: (t.cashBs || 0) < 0 ? '#DC2626' : '#059669', fontSize: '14px' }}>
            <span>(=) Saldo Gaveta Bs:</span>
            <span>{t.currencySymbol} {Number(t.cashBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
            <span>Equivalente en Dólares:</span>
            <strong>${Number(t.cashBsEquivalentUSD || 0).toFixed(2)} USD</strong>
          </div>
        </div>
      );
    },
  },

  treasury_banks: {
    key: 'treasury_banks',
    title: 'Bancos (Punto + Pago Móvil + Transferencias)',
    category: 'Tesorería y Fondos Reales',
    icon: cardOutline,
    accentColor: '#1D4ED8',
    accentBg: '#EFF6FF',
    shortSummary: 'Saldo total disponible en tus cuentas bancarias nacionales en Bolívares y su equivalente en dólares.',
    whatItMeans:
      'Es la acumulación de todo el dinero digital en moneda nacional que ha ingresado a tus cuentas bancarias por transferencias, pagos móviles o puntos de venta (POS), restando los gastos y las compras de divisas.',
    formula:
      'Saldo Bancos (Bs) = Saldo Inicial Bs + Cobros por Punto + Cobros por Pago Móvil + Transferencias Bs - Vueltos en Bs - Gastos Bancarios en Bs - Bolívares gastados en Comprar USD\nEquivalente USD = Saldo Bancos (Bs) ÷ Tasa de Cambio del Sistema',
    formulaTerms: [
      { term: 'Saldo Inicial Bs', explanation: 'Monto con el que abriste el registro de cuentas bancarias.', operation: '+' },
      { term: 'Punto de Venta', explanation: 'Cobros realizados con tarjeta de débito/crédito en el punto.', operation: '+' },
      { term: 'Pago Móvil', explanation: 'Cobros recibidos por Pago Móvil interbancario.', operation: '+' },
      { term: 'Transferencias', explanation: 'Depósitos y transferencias bancarias recibidas.', operation: '+' },
      { term: 'Gastos en Bolívares', explanation: 'Pagos a proveedores, servicios o nómina debitados de cuentas bancarias.', operation: '-' },
      { term: 'Compras de USD', explanation: 'Bolívares que gastaste para comprar divisas en efectivo o USDT.', operation: '-' },
    ],
    dataSources: [
      'Ventas POS y abonos registrados con métodos: Punto, Pago Móvil o Transferencia.',
      'Tasa de cambio del día registrada en Configuración.',
      'Egresos bancarios en el módulo de Gastos.',
      'Operaciones registradas con el botón "Comprar USD / Proteger Bs".',
    ],
    example:
      'Si tienes Bs 10,000 en el banco y la tasa es de Bs 40 por dólar, tu poder de compra real en moneda dura es: 10,000 ÷ 40 = $250.00 USD.',
    financialTip:
      'Para protegerte de la devaluación, usa el botón "Comprar USD / Proteger Bs" periódicamente cuando acumules bolívares por ventas electrónicas.',
    renderLiveCalculation: (summary) => {
      const t = summary?.treasury;
      if (!t) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Cobros Punto de Venta:</span>
            <strong>{t.currencySymbol} {Number(t.puntoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Cobros Pago Móvil:</span>
            <strong>{t.currencySymbol} {Number(t.pagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Transferencias Bancarias:</span>
            <strong>{t.currencySymbol} {Number(t.transferBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
            <span>(-) Bolívares cambiados a USD:</span>
            <strong>{t.currencySymbol} {Number(t.totalExchangedBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#0F172A', fontSize: '14px' }}>
            <span>(=) Saldo Banco:</span>
            <span>{t.currencySymbol} {Number(t.bankBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
            <span>Equivalente en Dólares (Tasa {Number(t.exchangeRate || 0).toFixed(2)}):</span>
            <strong style={{ color: '#047857' }}>${Number(t.bankBsEquivalentUSD || 0).toFixed(2)} USD</strong>
          </div>
        </div>
      );
    },
  },

  treasury_digital: {
    key: 'treasury_digital',
    title: 'Digital (Binance / USDT)',
    category: 'Tesorería y Fondos Reales',
    icon: swapHorizontalOutline,
    accentColor: '#D97706',
    accentBg: '#FEF3C7',
    shortSummary: 'Saldo guardado en criptomonedas o pasarelas digitales internacionales.',
    whatItMeans:
      'Representa los fondos estables en dólares digitales (USDT, Binance Pay, Zelle o criptomonedas) disponibles como reserva de valor o método de pago alternativo.',
    formula:
      'Saldo Digital = Saldo Inicial Digital + Cobros en Cripto/Digital + Bolívares o USD convertidos con destino Binance/USDT - Egresos Digitales',
    formulaTerms: [
      { term: 'Saldo Inicial Digital', explanation: 'Fondos iniciales registrados en la billetera.', operation: '+' },
      { term: 'Ventas Digitales', explanation: 'Cobros recibidos por Binance Pay o cripto.', operation: '+' },
      { term: 'Conversión a USDT', explanation: 'Bolívares o efectivo cambiados a USDT en "Comprar USD".', operation: '+' },
      { term: 'Gastos Digitales', explanation: 'Compras o pagos realizados directamente desde la billetera.', operation: '-' },
    ],
    dataSources: [
      'Órdenes pagadas con Binance, Zelle, USDT o cripto.',
      'Operaciones de intercambio en "Comprar USD" con destino "Binance / USDT".',
    ],
    example:
      'Si tienes $150 iniciales y cambiaste Bs 4,000 (a tasa 40 = $100 USDT) con destino Binance, tu saldo digital será de $250.00 USDT.',
    financialTip:
      'Mantener parte de tus reservas en USDT te permite comprar mercancía internacional o pagar proveedores sin riesgo cambiario.',
  },

  treasury_cop: {
    key: 'treasury_cop',
    title: 'Caja Pesos Colombianos (COP)',
    category: 'Tesorería y Fondos Reales',
    icon: walletOutline,
    accentColor: '#B45309',
    accentBg: '#FEF3C7',
    shortSummary: 'Saldo físico o bancario disponible en Pesos Colombianos (COP).',
    whatItMeans:
      'Representa el arqueo de caja en Pesos Colombianos ingresados por ventas en efectivo o transferencias directas (Bancolombia, Nequi), menos los gastos u operaciones en COP.',
    formula:
      'Caja COP = Saldo Inicial COP + Ventas y Cobros en COP - Egresos en COP\nEquivalente USD = Saldo COP ÷ Tasa COP/USD configurada',
    formulaTerms: [
      { term: 'Saldo Inicial COP', explanation: 'Monto con el que abriste el registro de caja en Pesos Colombianos.', operation: '+' },
      { term: 'Cobros Efectivo COP', explanation: 'Billetes de pesos recibidos en punto de venta o mostrador.', operation: '+' },
      { term: 'Transferencias COP', explanation: 'Pagos electrónicos recibidos en cuentas Nequi o Bancolombia.', operation: '+' },
      { term: 'Gastos en Pesos COP', explanation: 'Pagos a proveedores o fletes cancelados en Pesos.', operation: '-' },
    ],
    dataSources: [
      'Órdenes pagadas en método CASH_COP o TRANSFER_COP.',
      'Gastos operativos registrados con método de pago en Pesos Colombianos.',
      'Saldo inicial configurado en Tesorería.',
    ],
    example:
      'Si tienes un saldo inicial de $600.000 COP y cobraste $400.000 COP en ventas del día, tu saldo en caja será de $1.000.000 COP (equiv. a $250.00 USD con tasa 4.000).',
    financialTip:
      'Si operas en zona fronteriza o recibes pesos colombianos con frecuencia, mantén tu tasa COP actualizada diariamente en la configuración para evitar pérdidas por diferencial cambiario.',
    renderLiveCalculation: (summary) => {
      const t = summary?.treasury;
      if (!t) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B45309' }}>
            <span>(+) Saldo Inicial COP:</span>
            <strong>$ {Number(t.initialCashCop || 0).toLocaleString('es-CO')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>Tasa de Cambio COP:</span>
            <strong>{Number(t.exchangeRateCop || 4000).toLocaleString('es-CO')} COP / USD</strong>
          </div>
          <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: (t.cashCop || 0) < 0 ? '#DC2626' : '#B45309', fontSize: '14px' }}>
            <span>(=) Saldo Total COP:</span>
            <span>$ {Number(t.cashCop || 0).toLocaleString('es-CO')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
            <span>Equivalente en Dólares:</span>
            <strong>${Number(t.copEquivalentUSD || 0).toFixed(2)} USD</strong>
          </div>
        </div>
      );
    },
  },

  treasury_bank_cop: {
    key: 'treasury_bank_cop',
    title: 'Bancos Colombia (Nequi / Bancolombia / Daviplata)',
    category: 'Tesorería y Fondos Reales',
    icon: cardOutline,
    accentColor: '#92400E',
    accentBg: '#FEF3C7',
    shortSummary: 'Dinero electrónico en cuentas colombianas y transferencias en COP.',
    whatItMeans:
      'Representa el saldo acumulado en cuentas colombianas (Bancolombia, Nequi, Daviplata) por pagos electrónicos o compras de insumos en Colombia.',
    formula:
      'Bancos COP = Saldo Inicial Bancos COP + Cobros Electrónicos COP - Egresos Bancarios COP\nEquivalente USD = Saldo Bancos COP ÷ Tasa COP/USD',
    formulaTerms: [
      { term: 'Saldo Inicial Bancos COP', explanation: 'Saldo inicial declarado en cuentas colombianas.', operation: '+' },
      { term: 'Transferencias Bancolombia/Nequi', explanation: 'Pagos electrónicos recibidos de clientes.', operation: '+' },
      { term: 'Egresos en Cuentas COP', explanation: 'Pagos bancarios a proveedores en Colombia.', operation: '-' },
    ],
    dataSources: [
      'Órdenes pagadas por transferencia colombiana (TRANSFER_COP / BANK_COP).',
      'Configuración de cuentas bancarias colombianas.',
      'Saldo inicial de bancos COP en Tesorería.',
    ],
    example:
      'Si recibiste pagos por $1.200.000 COP en Nequi y gastaste $400.000 COP en transferencias de insumos, tu saldo disponible es de $800.000 COP.',
    financialTip:
      'Mantén control directo de tus recibos de Nequi o Bancolombia verificando que las referencias coincidan con las registradas en el POS.',
    renderLiveCalculation: (summary) => {
      const t = summary?.treasury;
      if (!t) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#92400E' }}>
            <span>(+) Saldo Inicial Bancos COP:</span>
            <strong>$ {Number(t.initialBankCop || 0).toLocaleString('es-CO')} COP</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>Tasa de Cambio COP:</span>
            <strong>{Number(t.exchangeRateCop || 4000).toLocaleString('es-CO')} COP / USD</strong>
          </div>
          <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: (t.bankCop || 0) < 0 ? '#DC2626' : '#92400E', fontSize: '14px' }}>
            <span>(=) Saldo Bancos COP:</span>
            <span>$ {Number(t.bankCop || 0).toLocaleString('es-CO')} COP</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
            <span>Equivalente en Dólares:</span>
            <strong>${Number(t.bankCopEquivalentUSD || 0).toFixed(2)} USD</strong>
          </div>
        </div>
      );
    },
  },

  monthly_invoiced: {
    key: 'monthly_invoiced',
    title: 'Facturado del Mes',
    category: 'Arqueo Mensual Detallado',
    icon: cartOutline,
    accentColor: '#0F172A',
    accentBg: '#F8FAFC',
    shortSummary: 'Volumen total comercial de ventas y servicios agendados en el mes.',
    whatItMeans:
      'Es el valor total de todas las ventas formalizadas y citas atendidas durante el mes seleccionado, sin importar si el cliente pagó de contado o si tiene un saldo a crédito pendiente por pagar.',
    formula:
      'Facturado del Mes = ∑ Total de Órdenes POS del mes + ∑ Total de Citas/Servicios del mes\n(Excluye cotizaciones pendientes sin pagar y órdenes canceladas)',
    formulaTerms: [
      { term: 'Ventas de Contado (POS)', explanation: 'Monto total de ventas liquidadas en caja durante el mes.', operation: '+' },
      { term: 'Ventas a Crédito / Con Abono', explanation: 'Monto total pactado en pedidos que ya tienen abono o entrega en el mes.', operation: '+' },
      { term: 'Citas y Servicios Atendidos', explanation: 'Ingresos de citas agendadas y confirmadas en el mes.', operation: '+' },
      { term: 'Cancelados / Cotizaciones', explanation: 'No se computan porque no son ventas reales confirmadas.', operation: 'info' },
    ],
    dataSources: [
      'Órdenes en POS cuya fecha de entrega o realización corresponda al mes seleccionado.',
      'Citas agendadas con estado completado o pagado.',
      'Excluye órdenes con estado Cancelado o cancelado por proveedor.',
    ],
    example:
      'Si vendiste 10 productos a $10 c/u pagados de contado ($100) y realizaste 1 pedido especial de $80 con un abono inicial de $30, tu Facturado del Mes es de $180.00 ($100 + $80).',
    financialTip:
      '¡No confundas "Facturado" con dinero en mano! El Facturado mide el nivel de ventas de tu negocio, mientras que "Cobrado Real" mide el dinero que realmente entró a tu caja.',
    renderLiveCalculation: (_, monthlyData) => {
      if (!monthlyData) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0F172A' }}>
            <span>🧾 Órdenes registradas del mes:</span>
            <strong>{monthlyData.ordersCount || 0} órdenes</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
            <span>Total Facturado del Período:</span>
            <strong style={{ fontSize: '15px' }}>${Number(monthlyData.invoicedRevenue || 0).toFixed(2)} USD</strong>
          </div>
        </div>
      );
    },
  },

  monthly_collected: {
    key: 'monthly_collected',
    title: 'Cobrado Real (Debe Contable)',
    category: 'Arqueo Mensual Detallado',
    icon: walletOutline,
    accentColor: '#047857',
    accentBg: '#ECFDF5',
    shortSummary: 'Dinero líquido real que efectivamente ingresó a caja o bancos este mes.',
    whatItMeans:
      'Es el flujo de caja positivo efectivo recibido en las fechas de este mes. Incluye las ventas de contado del mes, más los abonos y finiquitos de deudas cobrados durante este período exacto.',
    formula:
      'Cobrado Real = ∑ Pagos de Contado del Mes + ∑ Abonos Recibidos en el Mes + ∑ Finiquitos de Cuentas Cobrados en el Mes',
    formulaTerms: [
      { term: 'Pagos de Contado', explanation: 'Ventas que el cliente canceló completamente en el momento.', operation: '+' },
      { term: 'Abonos / Adelantos', explanation: 'Adelantos de dinero recibidos para pedidos o citas.', operation: '+' },
      { term: 'Finiquitos de Entrega', explanation: 'Cobro del saldo restante al entregar el producto al cliente.', operation: '+' },
      { term: 'Saldos Pendientes', explanation: 'Lo que el cliente todavía debe NO entra aquí hasta que pague.', operation: 'info' },
    ],
    dataSources: [
      'Historial de pagos y abonos registrados con fecha dentro del mes objetivo.',
      'Pagos divididos (split payments) y cobros de contado en POS.',
      'Abonos aprobados en citas y reservas.',
    ],
    example:
      'Si un cliente hace un pedido de $100 pero solo abonó $40 este mes, tu Cobrado Real de esa venta es de solo $40.00.',
    financialTip:
      'El Cobrado Real es el dinero con el que puedes pagar compromisos inmediatos hoy. Una empresa puede quebrar con alto facturado si no tiene cobro real oportuno.',
    renderLiveCalculation: (_, monthlyData) => {
      if (!monthlyData) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
            <span>💵 Total cobrado y en mano este mes:</span>
            <strong style={{ fontSize: '15px' }}>${Number(monthlyData.collectedRevenue || 0).toFixed(2)} USD</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
            <span>Comparado con lo Facturado:</span>
            <span>{Number(monthlyData.invoicedRevenue || 0) > 0 ? ((Number(monthlyData.collectedRevenue || 0) / Number(monthlyData.invoicedRevenue || 1)) * 100).toFixed(1) + '% cobrado' : '0%'}</span>
          </div>
        </div>
      );
    },
  },

  monthly_pending: {
    key: 'monthly_pending',
    title: 'Por Cobrar del Mes (Cuentas Abiertas)',
    category: 'Arqueo Mensual Detallado',
    icon: calendarOutline,
    accentColor: '#B45309',
    accentBg: '#FFFBEB',
    shortSummary: 'Dinero pendiente que tus clientes deben por ventas y pedidos de este mes.',
    whatItMeans:
      'Representa las cuentas por cobrar a clientes. Es la diferencia entre lo que vendiste o acordaste entregar este mes y lo que los clientes ya han pagado hasta ahora.',
    formula:
      'Por Cobrar = Facturado de Órdenes del Mes - Abonos y Cobros ya Realizados de esas Órdenes',
    formulaTerms: [
      { term: 'Monto Total Facturado', explanation: 'Valor total comprometido en los pedidos del mes.', operation: '+' },
      { term: 'Abonos Recibidos', explanation: 'Dinero que el cliente ya entregó a cuenta.', operation: '-' },
      { term: 'Saldo Restante', explanation: 'Monto que falta por cobrar al entregar o finiquitar el pedido.', operation: '=' },
    ],
    dataSources: [
      'Órdenes del mes con estado de pago "Parcial" o "Pendiente".',
      'Citas con abono parcial pendiente de finiquito.',
    ],
    example:
      'Si hiciste una venta de $150 y el cliente dejó un anticipo de $50, el monto "Por Cobrar" es de $100.00.',
    financialTip:
      'Revisa tu módulo de Pedidos o Citas para contactar a los clientes y coordinar el cobro restante en el momento de la entrega.',
    renderLiveCalculation: (_, monthlyData) => {
      if (!monthlyData) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B45309' }}>
            <span>⏳ Saldo por cobrar a clientes:</span>
            <strong style={{ fontSize: '15px' }}>${Number(monthlyData.pendingReceivable || 0).toFixed(2)} USD</strong>
          </div>
        </div>
      );
    },
  },

  monthly_expenses: {
    key: 'monthly_expenses',
    title: 'Gastos + Costos del Mes (Haber Contable)',
    category: 'Arqueo Mensual Detallado',
    icon: trendingDownOutline,
    accentColor: '#DC2626',
    accentBg: '#FEF2F2',
    shortSummary: 'Total de salidas de dinero, costos de mercancía y obligaciones devengadas en el mes.',
    whatItMeans:
      'Agrupa todos los desembolsos y costos en los que incurrió tu negocio en el mes: lo que te costó producir o comprar los productos vendidos (Costo de Ventas / COGS), más los gastos operativos cotidianos (alquiler, luz, nómina) y las mermas.',
    formula:
      'Total Egresos = Costo de Venta (COGS) + Gastos Operativos Generales + Nómina + Mermas del Mes',
    formulaTerms: [
      { term: 'Costo de Venta (COGS)', explanation: 'Insumos y materia prima consumida para elaborar los productos vendidos, o costo mayorista de reventa.', operation: '+' },
      { term: 'Gastos Operativos', explanation: 'Servicios, suministros, alquiler, comisiones y mantenimiento.', operation: '+' },
      { term: 'Nómina / Salarios', explanation: 'Sueldos, honorarios y pagos de personal registrados en el módulo de Gastos.', operation: '+' },
      { term: 'Mermas y Pérdidas', explanation: 'Pérdidas de material vencido o pedidos cerrados con pérdida en el mes.', operation: '+' },
    ],
    dataSources: [
      'Recetas de productos e insumos consumidos en las ventas del mes.',
      'Módulo de Gastos Operativos (excluyendo fondos de apertura de caja).',
      'Gastos clasificados bajo la categoría "Nómina / Sueldos".',
      'Ajustes de inventario por merma registrados en el mes.',
    ],
    example:
      'Si vendiste tortas cuyo costo de ingredientes fue de $120, pagaste $80 de servicios/alquiler, $100 de nómina y tuviste $10 en ingredientes dañados: Total = 120 + 80 + 100 + 10 = $310.00.',
    financialTip:
      'Mantén actualizado el costo de tus insumos en el inventario para que el cálculo de COGS refleje siempre tu costo real de producción.',
    renderLiveCalculation: (_, monthlyData) => {
      if (!monthlyData) return null;
      const cogs = Number(monthlyData.cogs ?? monthlyData.costOfGoodsSold ?? 0);
      const oper = Number(monthlyData.expenses ?? monthlyData.operatingExpenses ?? 0);
      const payroll = Number(monthlyData.payroll || 0);
      const losses = Number(monthlyData.losses || 0);
      const total = cogs + oper + payroll + losses;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Costo de Mercancía Vendida (COGS):</span>
            <strong>${cogs.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Gastos Operativos Generales:</span>
            <strong>${oper.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Nómina y Sueldos:</span>
            <strong>${payroll.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Mermas / Desperdicio:</span>
            <strong>${losses.toFixed(2)}</strong>
          </div>
          <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#DC2626', fontSize: '14px' }}>
            <span>(=) Total Gastos + Costos (Haber):</span>
            <span>${total.toFixed(2)} USD</span>
          </div>
        </div>
      );
    },
  },

  monthly_profit: {
    key: 'monthly_profit',
    title: 'Ganancia Neta del Mes (Utilidad Libre)',
    category: 'Arqueo Mensual Detallado',
    icon: trendingUpOutline,
    accentColor: '#10B981',
    accentBg: '#ECFDF5',
    shortSummary: 'El beneficio limpio y real generado por tu negocio en el mes.',
    whatItMeans:
      'Es el rendimiento económico neto final. Indica cuánto dinero le quedó libre a la empresa tras cubrir el costo de los productos vendidos, todos los gastos del local, salarios y mermas.',
    formula:
      'Ganancia Neta = Facturado del Mes - Costo de Ventas (COGS) - Gastos Operativos - Nómina - Mermas',
    formulaTerms: [
      { term: 'Facturado del Mes', explanation: 'Ingresos generados por las ventas del mes.', operation: '+' },
      { term: 'Costo de Ventas (COGS)', explanation: 'Lo que te costó comprar o preparar lo que vendiste.', operation: '-' },
      { term: 'Gastos Operativos', explanation: 'Servicios, alquileres, insumos de limpieza, etc.', operation: '-' },
      { term: 'Nómina', explanation: 'Pagos al equipo y trabajadores.', operation: '-' },
      { term: 'Mermas del Mes', explanation: 'Pérdidas de inventario o productos dañados.', operation: '-' },
    ],
    dataSources: [
      'Facturación del mes en POS y Citas.',
      'Consumo de recetas y costo unitario de productos.',
      'Registro contable de gastos del período.',
    ],
    example:
      'Si facturaste $1,000 en el mes, el costo de los insumos fue $400, tus gastos operativos fueron $200 y pagaste $150 de nómina: Ganancia Neta = 1,000 - 400 - 200 - 150 = $250.00 de utilidad neta.',
    financialTip:
      'Una ganancia neta positiva y constante es el indicador de que tu negocio es saludable y rentable. Esta es la base sobre la que puedes reinvertir o retirar dividendos.',
    renderLiveCalculation: (_, monthlyData) => {
      if (!monthlyData) return null;
      const invoiced = Number(monthlyData.invoicedRevenue || 0);
      const cogs = Number(monthlyData.cogs ?? monthlyData.costOfGoodsSold ?? 0);
      const oper = Number(monthlyData.expenses ?? monthlyData.operatingExpenses ?? 0);
      const payroll = Number(monthlyData.payroll || 0);
      const losses = Number(monthlyData.losses || 0);
      const net = Number(monthlyData.netProfit || 0);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
            <span>(+) Facturado del Mes:</span>
            <strong>+${invoiced.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
            <span>(-) Costo de Mercancía (COGS):</span>
            <strong>-${cogs.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
            <span>(-) Gastos Operativos:</span>
            <strong>-${oper.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
            <span>(-) Nómina / Sueldos:</span>
            <strong>-${payroll.toFixed(2)}</strong>
          </div>
          {losses > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
              <span>(-) Mermas / Pérdidas:</span>
              <strong>-${losses.toFixed(2)}</strong>
            </div>
          )}
          <div style={{ borderTop: '1.5px solid #10B981', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: net >= 0 ? '#10B981' : '#DC2626', fontSize: '15px' }}>
            <span>(=) Ganancia Neta del Mes:</span>
            <span>${net.toFixed(2)} USD</span>
          </div>
        </div>
      );
    },
  },

  monthly_by_method: {
    key: 'monthly_by_method',
    title: 'Arqueo por Método de Pago (Mes)',
    category: 'Arqueo Mensual Detallado',
    icon: cardOutline,
    accentColor: '#4F46E5',
    accentBg: '#EEF2FF',
    shortSummary: 'Distribución exacta de los cobros del mes según el canal de pago utilizado.',
    whatItMeans:
      'Permite auditar por dónde ingresó cada centavo que cobraste en el mes: cuánto entró en billetes en efectivo, cuánto por Pago Móvil, cuánto por Punto de Venta y cuánto por Transferencia bancaria o Binance.',
    formula:
      'Cobros por Método = ∑ Pagos recibidos en el mes clasificados según la forma de pago registrada\n(Los montos en Bolívares se expresan en su equivalente en USD a la tasa correspondiente)',
    formulaTerms: [
      { term: 'Efectivo USD', explanation: 'Billetes físicos en dólares recibidos en caja.', operation: 'info' },
      { term: 'Pago Móvil', explanation: 'Pagos móviles interbancarios en bolívares.', operation: 'info' },
      { term: 'Punto de Venta', explanation: 'Tarjetas pasadas por el punto de cobro.', operation: 'info' },
      { term: 'Transferencias', explanation: 'Transferencias bancarias directas.', operation: 'info' },
      { term: 'Binance / Digital', explanation: 'Criptomonedas USDT o pagos digitales.', operation: 'info' },
    ],
    dataSources: [
      'Abonos y cobros registrados en cada orden POS con su método específico.',
      'Tasa de cambio del día de la orden para convertir los bolívares a USD.',
    ],
    example:
      'Si cobraste $100 en efectivo, $50 en pago móvil y $50 por punto, tu arqueo muestra $100 en USD y $100 equivalente en bancos.',
    financialTip:
      'Compara estos totales contra los estados de cuenta de tus bancos para verificar que no haya pagos pendientes por conciliar.',
  },

  monthly_unpaid_bookings: {
    key: 'monthly_unpaid_bookings',
    title: 'Citas / Pedidos por Confirmar o Sin Pagar',
    category: 'Arqueo Mensual Detallado',
    icon: alertCircleOutline,
    accentColor: '#D97706',
    accentBg: '#FEF3C7',
    shortSummary: 'Citas agendadas o cotizaciones abiertas que aún no han sido cobradas.',
    whatItMeans:
      'Muestra las citas o solicitudes de encargo programadas para este mes en las que el cliente aún no ha hecho ningún pago o abono. Para no inflar tus números de manera falsa, el sistema NO las suma como venta facturada ni en tesorería hasta que recibas y confirmes el pago.',
    formula:
      'Total por Confirmar = ∑ Monto de citas y pedidos agendados para este mes con estado "Pendiente" y sin abonos registrados',
    formulaTerms: [
      { term: 'Citas Pendientes', explanation: 'Reservas creadas por clientes desde el link público o por recepción que no tienen pago cargado.', operation: '+' },
      { term: 'Pedidos por Encargo', explanation: 'Cotizaciones abiertas en espera de pago para iniciar producción.', operation: '+' },
      { term: 'Impacto Contable', explanation: '0% en facturado y 0% en caja hasta registrar el pago real.', operation: 'info' },
    ],
    dataSources: [
      'Módulo de Citas / Agenda con estado PENDING y sin abonos.',
      'Pedidos en estado "Solicitud Encargo" con pago PENDING.',
    ],
    example:
      'Si tienes 3 citas agendadas por un total de $60 pero los clientes no han abonado, se muestran como una oportunidad potencial de $60, sin alterar tu facturado real.',
    financialTip:
      'Solicita un anticipo o abono de confirmación (ej. 50%) desde la configuración de reservas para asegurar la asistencia de los clientes.',
  },

  historical_revenue: {
    key: 'historical_revenue',
    title: 'Ingresos Totales (Histórico Acumulado)',
    category: 'Acumulativo Total Histórico',
    icon: walletOutline,
    accentColor: '#0F172A',
    accentBg: '#F8FAFC',
    shortSummary: 'La suma global de todas las ventas facturadas desde el inicio del negocio.',
    whatItMeans:
      'Representa el volumen de ventas histórico absoluto que ha generado tu negocio desde el día uno que empezaste a operar con FinoWork hasta el momento actual.',
    formula:
      'Ingresos Históricos = ∑ Todas las ventas de órdenes POS cerradas + ∑ Todas las citas completadas y pagadas\n(Excluye órdenes canceladas)',
    formulaTerms: [
      { term: 'Órdenes POS Históricas', explanation: 'Ventas de productos y servicios registradas en mostrador.', operation: '+' },
      { term: 'Citas Históricas', explanation: 'Servicios de agenda concluidos y liquidados.', operation: '+' },
      { term: 'Cancelados', explanation: 'Ventas anuladas se descartan del total.', operation: 'info' },
    ],
    dataSources: [
      'Base de datos completa de órdenes y reservas no canceladas de tu empresa.',
    ],
    example:
      'Si en tu primer mes facturaste $3,000, en el segundo $4,000 y en el actual vas en $2,500, tu ingreso histórico consolidado es de $9,500.00.',
    financialTip:
      'Esta métrica mide el tamaño y la tracción de tu marca en el tiempo. Úsala para analizar tu crecimiento interanual.',
  },

  historical_profit: {
    key: 'historical_profit',
    title: 'Ganancia Neta Real (Histórico Acumulado)',
    category: 'Acumulativo Total Histórico',
    icon: trendingUpOutline,
    accentColor: '#10B981',
    accentBg: '#ECFDF5',
    shortSummary: 'Beneficio neto acumulado total después de costos y gastos operativos.',
    whatItMeans:
      'Es la ganancia limpia total que tu empresa ha producido en toda su historia. Se obtiene restándole a los ingresos totales lo que costó producir los productos vendidos (COGS acumulado) y todos los gastos operativos registrados hasta la fecha.',
    formula:
      'Ganancia Neta Histórica = Ingresos Históricos - Costo Total de Ventas (COGS) - Gastos Operativos Totales - Nómina Histórica',
    formulaTerms: [
      { term: 'Ingresos Históricos', explanation: 'Total de ventas facturadas acumuladas.', operation: '+' },
      { term: 'Costo de Ventas Acumulado', explanation: 'Insumos y materia prima consumida en toda la historia de ventas.', operation: '-' },
      { term: 'Gastos Operativos Acumulados', explanation: 'Todos los gastos de local, suministros, fletes y servicios.', operation: '-' },
      { term: 'Nómina Acumulada', explanation: 'Total de salarios y honorarios pagados.', operation: '-' },
    ],
    dataSources: [
      'Ingresos de órdenes activas.',
      'Cálculo de costo de recetas de cada ítem vendido.',
      'Historial completo del módulo de Gastos Operativos.',
    ],
    example:
      'Si has vendido $20,000 históricamente, con un costo de ventas de $8,000 y gastos totales de $5,000: tu ganancia neta histórica es de $7,000.00.',
    financialTip:
      'Compara tu Ganancia Neta Histórica contra la Inversión Total para medir el ROI (Retorno sobre la Inversión) de tu emprendimiento.',
  },

  historical_investment: {
    key: 'historical_investment',
    title: 'Inversión / Reinversión (Capital Total)',
    category: 'Acumulativo Total Histórico',
    icon: cartOutline,
    accentColor: '#B45309',
    accentBg: '#FFFBEB',
    shortSummary: 'Capital externo inyectado más utilidades del negocio reinvertidas.',
    whatItMeans:
      'Muestra el esfuerzo financiero total puesto en el negocio. Se desglosa en dos partes: Inversión Externa (dinero de socios o préstamos inyectados) y Reinversión (ganancias que el negocio no repartió, sino que usó para comprar inventario, insumos o maquinaria).',
    formula:
      'Capital Consolidado = Inversión Externa Aportada + Reinversión de Ganancias Registrada + Reinversión Estimada en Inventario',
    formulaTerms: [
      { term: 'Inversión Externa', explanation: 'Capital inyectado por socios o dueños de fuentes ajenas al negocio.', operation: '+' },
      { term: 'Reinversión Registrada', explanation: 'Aportes cargados en el modal "Inversión / Capital" marcados como reinversión.', operation: '+' },
      { term: 'Excedente de Compras', explanation: 'Compras de inventario y materia prima que superan el capital actual en almacén.', operation: '+' },
    ],
    dataSources: [
      'Registros cargados en el módulo "Inversión / Capital".',
      'Compras de materia prima registradas en inventario.',
    ],
    example:
      'Si iniciaste con $1,000 de tus ahorros (Inversión Externa) y luego usaste $500 de las ganancias del negocio para comprar una batidora industrial (Reinversión), tu capital consolidado es de $1,500.00.',
    financialTip:
      'Haz clic en esta tarjeta para registrar nuevos aportes de socios o registrar compras de activos con las ganancias de la empresa.',
    renderLiveCalculation: (summary) => {
      if (!summary) return null;
      const ext = Number(summary.totalExternalInvestment || 0);
      const reinv = Number(summary.totalConsolidatedReinvestment !== undefined ? summary.totalConsolidatedReinvestment : summary.reinvestmentExpense || 0);
      const tot = Number((summary.totalConsolidatedInvestment !== undefined ? summary.totalConsolidatedInvestment : ext + reinv));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Inversión Externa (Socios/Capital):</span>
            <strong>${ext.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E293B' }}>
            <span>(+) Reinversión de Ganancias:</span>
            <strong>${reinv.toFixed(2)}</strong>
          </div>
          <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#B45309', fontSize: '14px' }}>
            <span>(=) Inversión Consolidada Total:</span>
            <span>${tot.toFixed(2)} USD</span>
          </div>
        </div>
      );
    },
  },

  historical_losses: {
    key: 'historical_losses',
    title: 'Mermas & Pérdidas (Histórico)',
    category: 'Acumulativo Total Histórico',
    icon: trendingDownOutline,
    accentColor: '#DC2626',
    accentBg: '#FEF2F2',
    shortSummary: 'Valor monetario total de insumos dañados, vencidos o pedidos perdidos.',
    whatItMeans:
      'Es la acumulación de todo el valor económico que se ha perdido por desperdicios de cocina/producción, ingredientes vencidos, roturas de envases o pedidos que tuvieron que ser cancelados asumiendo el costo.',
    formula:
      'Total Pérdidas = ∑ Movimientos de inventario tipo "Pérdida/Merma" (Cantidad × Costo) + ∑ Costo de Órdenes cerradas con pérdida',
    formulaTerms: [
      { term: 'Desperdicio de Insumos', explanation: 'Materia prima dada de baja en inventario por vencimiento o daño.', operation: '+' },
      { term: 'Pedidos con Pérdida', explanation: 'Órdenes canceladas tras haber elaborado el producto sin poder recuperar el costo.', operation: '+' },
    ],
    dataSources: [
      'Movimientos de inventario de materia prima marcados como "Pérdida / Merma".',
      'Órdenes de venta con estado "Cerrado con Pérdida".',
    ],
    example:
      'Si se vencieron 5 kg de harina con costo de $2/kg ($10) y un cliente canceló un pedido de $15 cuando ya estaba cocinado, tu merma acumulada es de $25.00.',
    financialTip:
      'Revisa periódicamente los motivos de merma en el historial de inventario para ajustar recetas y reducir el desperdicio operativo.',
  },

  sales_chart: {
    key: 'sales_chart',
    title: 'Ventas de los Últimos 7 Días',
    category: 'Análisis de Tendencias',
    icon: trendingUpOutline,
    accentColor: '#10B981',
    accentBg: '#ECFDF5',
    shortSummary: 'Ritmo diario de facturación durante la última semana.',
    whatItMeans:
      'Muestra la evolución diaria de tus ventas en los últimos 7 días consecutivos. Te ayuda a detectar qué días de la semana registran mayor demanda y evaluar el efecto de promociones recientes.',
    formula:
      'Venta Diaria = ∑ Ventas POS y Citas facturadas en cada fecha (Zona horaria de tu negocio)',
    formulaTerms: [
      { term: 'Órdenes POS', explanation: 'Ventas cerradas en esa fecha.', operation: '+' },
      { term: 'Citas Pagadas', explanation: 'Servicios atendidos en esa fecha.', operation: '+' },
    ],
    dataSources: [
      'Registro de órdenes y reservas creadas en los últimos 7 días calendario.',
    ],
    example:
      'Permite comparar si los viernes o sábados son tus días pico para optimizar el inventario y la programación del personal.',
    financialTip:
      'Identifica tus días de baja venta para crear ofertas flash o promociones de fidelización.',
  },

  top_products: {
    key: 'top_products',
    title: 'Productos Más Vendidos',
    category: 'Análisis de Rendimiento',
    icon: pieChartOutline,
    accentColor: '#10B981',
    accentBg: '#ECFDF5',
    shortSummary: 'Ranking de los 5 artículos con mayor volumen de unidades vendidas.',
    whatItMeans:
      'Identifica cuáles son tus productos estrella (bestsellers). Muestra tanto la cantidad total de unidades despachadas como la facturación total que han generado para el negocio.',
    formula:
      'Total Unidades = ∑ Cantidad vendida de ese ítem en órdenes no canceladas\nIngreso Generado = ∑ Subtotal facturado por ese ítem',
    formulaTerms: [
      { term: 'Unidades Vendidas', explanation: 'Suma de ítems entregados o facturados.', operation: 'info' },
      { term: 'Facturación del Ítem', explanation: 'Dinero generado por ese producto específico.', operation: 'info' },
    ],
    dataSources: [
      'Detalle de renglones (OrderItem) de todas las órdenes válidas registradas en el sistema.',
    ],
    example:
      'Si vendiste 45 hamburguesas a $5 c/u, el producto muestra "45 unidades vendidas" y "$225.00 generados".',
    financialTip:
      'Asegúrate de nunca quedarte sin materia prima para estos 5 productos, ya que son el motor principal del flujo de ingresos de tu empresa.',
  },

  inventory_low_materials: {
    key: 'inventory_low_materials',
    title: 'Insumos por Reabastecer',
    category: 'Inventario y Producción',
    icon: alertCircleOutline,
    accentColor: '#DC2626',
    accentBg: '#FEF2F2',
    shortSummary: 'Materias primas que están por agotarse o comprometidas en pedidos pendientes.',
    whatItMeans:
      'Alerta inteligente que compara el inventario físico disponible en tu almacén con los pedidos pendientes de entrega. Si tras apartar los ingredientes necesarios para los pedidos por entregar tu stock queda por debajo de la alerta mínima, el sistema te avisa aquí.',
    formula:
      'Stock Efectivo = Stock Real en Bodega - Insumos Comprometidos en Pedidos Pendientes\nAlerta: Se activa si Stock Efectivo ≤ Stock Mínimo de Alerta',
    formulaTerms: [
      { term: 'Stock Real', explanation: 'Cantidad física que tienes en tu depósito.', operation: '+' },
      { term: 'Insumos Comprometidos', explanation: 'Material que vas a necesitar para los pedidos por entregar.', operation: '-' },
      { term: 'Stock Mínimo', explanation: 'Nivel de reserva mínima configurado para ese insumo.', operation: 'info' },
    ],
    dataSources: [
      'Stock de materias primas activas.',
      'Recetas de productos en órdenes pendientes por entregar.',
      'Alerta mínima establecida en cada insumo.',
    ],
    example:
      'Si tienes 10 kg de azúcar, pero tienes 3 tortas pendientes por hacer que requieren 8 kg, tu stock efectivo es de solo 2 kg. Si tu alerta mínima es 3 kg, aparecerá en esta lista.',
    financialTip:
      'Realiza tus pedidos a proveedores con anticipación antes de que el stock efectivo llegue a cero para evitar retrasos con los clientes.',
  },

  inventory_low_products: {
    key: 'inventory_low_products',
    title: 'Pedidos por Fabricar',
    category: 'Inventario y Producción',
    icon: alertCircleOutline,
    accentColor: '#D97706',
    accentBg: '#FFFBEB',
    shortSummary: 'Unidades de producto terminado vendidas que superan el stock listo en almacén.',
    whatItMeans:
      'Indica qué productos fueron vendidos en mostrador o agendados en pedidos por encargo y quedaron con saldo negativo en almacén, requiriendo que la cocina o el taller los fabrique de inmediato.',
    formula:
      'Unidades por Fabricar = |Stock Negativo| del Producto\n(Si Stock Actual < 0)',
    formulaTerms: [
      { term: 'Ventas Registradas', explanation: 'Unidades vendidas a clientes.', operation: 'info' },
      { term: 'Stock Físico Terminado', explanation: 'Unidades listas en vitrina.', operation: 'info' },
      { term: 'Déficit a Fabricar', explanation: 'Diferencia que el equipo de producción debe elaborar.', operation: '=' },
    ],
    dataSources: [
      'Catálogo de productos con recetas cuyo stock actual sea menor a 0.',
    ],
    example:
      'Si tenías 2 pasteles listos y te encargaron 5, tu stock es -3. Debes fabricar 3 pasteles para cumplir los pedidos.',
    financialTip:
      'Una vez cocinado o fabricado el lote, usa la opción "Fabricar / Producir" en el menú de Productos para que el stock vuelva a niveles positivos y se descuente la materia prima.',
  },
};

interface MetricInfoButtonProps {
  metricKey: MetricKey;
  onOpen: (key: MetricKey) => void;
  title?: string;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const MetricInfoButton: React.FC<MetricInfoButtonProps> = ({
  metricKey,
  onOpen,
  title = 'Ver cómo se calcula y fórmula',
  size = 'md',
  style,
}) => {
  const isSm = size === 'sm';
  const dim = isSm ? '24px' : '28px';
  const iconSize = isSm ? '15px' : '17px';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(metricKey);
      }}
      title={title}
      aria-label={title}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        color: '#94A3B8',
        transition: 'all 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--theme-primary, #0284C7)';
        e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#94A3B8';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <IonIcon icon={informationCircleOutline} style={{ fontSize: iconSize, pointerEvents: 'none' }} />
    </button>
  );
};

interface DashboardMetricInfoModalProps {
  metricKey: MetricKey | null;
  isOpen: boolean;
  onClose: () => void;
  summary: DashboardSummary | null;
  monthlyData: MonthlySummary | null;
}

export const DashboardMetricInfoModal: React.FC<DashboardMetricInfoModalProps> = ({
  metricKey,
  isOpen,
  onClose,
  summary,
  monthlyData,
}) => {
  if (!metricKey) return null;
  const def = METRIC_DEFINITIONS[metricKey];
  if (!def) return null;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      style={{
        '--border-radius': '20px',
        '--max-width': '620px',
        '--height': 'auto',
        '--max-height': '90vh',
      } as any}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar
          style={{
            '--background': '#ffffff',
            borderBottom: '1px solid #E2E8F0',
            padding: '6px 10px',
          } as any}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: def.accentBg,
                color: def.accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              <IonIcon icon={def.icon} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {def.category}
              </div>
              <IonTitle style={{ padding: 0, fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>
                {def.title}
              </IonTitle>
            </div>
          </div>

          <IonButtons slot="end">
            <IonButton onClick={onClose} color="medium">
              <IonIcon icon={closeOutline} style={{ fontSize: '22px' }} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          overflowY: 'auto',
          maxHeight: 'calc(90vh - 65px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Resumen conceptual */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
            💡 ¿Qué representa esta tarjeta?
          </div>
          <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.55' }}>
            {def.whatItMeans}
          </div>
        </div>

        {/* Caja de Fórmula Matemática */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: '14px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: '#166534', marginBottom: '8px' }}>
            <IonIcon icon={calculatorOutline} style={{ fontSize: '18px' }} />
            <span>📐 Fórmula de Cálculo</span>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              padding: '10px 14px',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '12px',
              fontWeight: '700',
              color: '#065F46',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5',
            }}
          >
            {def.formula}
          </div>

          {def.formulaTerms.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
                Desglose de Términos:
              </div>
              {def.formulaTerms.map((term, i) => (
                <div key={i} style={{ fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#14532D' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      backgroundColor: term.operation === '+' ? '#DCFCE7' : term.operation === '-' ? '#FEE2E2' : '#F1F5F9',
                      color: term.operation === '+' ? '#15803D' : term.operation === '-' ? '#B91C1C' : '#475569',
                      textAlign: 'center',
                      lineHeight: '18px',
                      fontWeight: '800',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {term.operation || '•'}
                  </span>
                  <div>
                    <strong style={{ color: '#0F172A' }}>{term.term}:</strong> {term.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cálculo en vivo con los números reales actuales del negocio */}
        {def.renderLiveCalculation && (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '14px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>
              <span>📊</span>
              <span>Tus Cifras Actuales en esta Métrica</span>
            </div>
            {def.renderLiveCalculation(summary, monthlyData)}
          </div>
        )}

        {/* En qué se basa (Fuentes de datos) */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IonIcon icon={checkmarkCircleOutline} style={{ color: '#10B981', fontSize: '17px' }} />
            <span>🔍 ¿En qué se basa el sistema para calcular este monto?</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
            {def.dataSources.map((ds, idx) => (
              <li key={idx}>{ds}</li>
            ))}
          </ul>
        </div>

        {/* Ejemplo práctico */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12.5px',
            color: '#1E3A8A',
            lineHeight: '1.5',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '3px', color: '#1D4ED8' }}>
            📝 Ejemplo Práctico:
          </strong>
          {def.example}
        </div>

        {/* Consejo Financiero */}
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12.5px',
            color: '#92400E',
            lineHeight: '1.5',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}
        >
          <IonIcon icon={bulbOutline} style={{ fontSize: '20px', color: '#D97706', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '2px', color: '#B45309' }}>
              Consejo FinoWork:
            </strong>
            {def.financialTip}
          </div>
        </div>

        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          className="ff-btn-primary bg-theme-primary"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            backgroundColor: 'var(--theme-primary, #10B981)',
            color: 'var(--theme-primary-contrast, #ffffff)',
            border: 'none',
            boxShadow: 'var(--ff-shadow-sm)',
            marginTop: '4px',
          }}
        >
          Entendido
        </button>
      </div>
    </IonModal>
  );
};

export default DashboardMetricInfoModal;
