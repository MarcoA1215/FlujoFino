import { TenantPlanType } from '@finowork/shared-types';

export const PLAN_BASE_MONTHLY_PRICE = 20.0;
export const PLAN_IVA_PERCENTAGE = 16;
export const PLAN_MONTHLY_FEE_WITH_IVA = 23.2; // 20 + 16% IVA

/**
 * Motor de cálculo de cuota mensual y descuentos por referidos.
 * - PIONEER: Si tiene >= 2 referidos activos, 100% de descuento ($0 fee). De lo contrario, precio base ($20) + 16% IVA ($3.20) = $23.20.
 * - REGULAR: 10% por referido activo, topado al 50%. Piso dinámico del 50% del precio base.
 * Al monto mensual se le añade el 16% de IVA ($20 mensualidad + IVA = $23.20).
 */
export function calculateSubscriptionFee(
  planType: TenantPlanType,
  basePrice: number = PLAN_BASE_MONTHLY_PRICE,
  activeReferrals: number = 0,
): {
  discountPercentage: number;
  subtotal: number;
  ivaPercentage: number;
  ivaAmount: number;
  finalFee: number;
} {
  let discountPercentage = 0;
  let subtotal = basePrice;

  if (planType === TenantPlanType.PIONEER) {
    if (activeReferrals >= 2) {
      discountPercentage = 100;
      subtotal = 0;
    } else {
      discountPercentage = 0;
      subtotal = basePrice;
    }
  } else {
    discountPercentage = Math.min(activeReferrals * 10, 50);
    const discounted = basePrice * (1 - discountPercentage / 100);
    const minAllowedFee = Math.round(basePrice * 0.5 * 100) / 100;
    subtotal = Math.max(minAllowedFee, Math.round(discounted * 100) / 100);
  }

  const ivaPercentage = PLAN_IVA_PERCENTAGE;
  const ivaAmount = subtotal > 0 ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
  const finalFee = Math.round((subtotal + ivaAmount) * 100) / 100;

  return { discountPercentage, subtotal, ivaPercentage, ivaAmount, finalFee };
}

/**
 * Convierte un monto en USD a su equivalente en Bolívares (Bs) a la tasa dada.
 */
export function calculateBsEquivalent(usdAmount: number, exchangeRate: number): number {
  return Math.round(usdAmount * exchangeRate * 100) / 100;
}

/**
 * Convierte un monto en Bolívares (Bs) a su equivalente en USD a la tasa dada.
 */
export function calculateUsdEquivalent(bsAmount: number, exchangeRate: number): number {
  if (exchangeRate <= 0) return 0;
  return Math.round((bsAmount / exchangeRate) * 100) / 100;
}

/**
 * Valida si al menos un método de cobro está habilitado en la configuración del comercio.
 */
export function hasAtLeastOnePaymentMethodActive(methods: {
  cashUsd?: boolean;
  pagoMovil?: boolean;
  cardPos?: boolean;
  binance?: boolean;
  transfer?: boolean;
}): boolean {
  return (
    methods.cashUsd === true ||
    methods.pagoMovil === true ||
    methods.cardPos === true ||
    methods.binance === true ||
    methods.transfer === true
  );
}
