import { TenantPlanType } from '@finowork/shared-types';

/**
 * Motor de cálculo de cuota mensual y descuentos por referidos.
 * - PIONEER: Si tiene >= 2 referidos activos, 100% de descuento ($0 fee). De lo contrario, precio base.
 * - REGULAR: 10% por referido activo, topado al 50%. Piso dinámico del 50% del precio base.
 */
export function calculateSubscriptionFee(
  planType: TenantPlanType,
  basePrice: number,
  activeReferrals: number,
): { discountPercentage: number; finalFee: number } {
  let discountPercentage = 0;
  let finalFee = basePrice;

  if (planType === TenantPlanType.PIONEER) {
    if (activeReferrals >= 2) {
      discountPercentage = 100;
      finalFee = 0;
    } else {
      discountPercentage = 0;
      finalFee = basePrice;
    }
  } else {
    discountPercentage = Math.min(activeReferrals * 10, 50);
    const discounted = basePrice * (1 - discountPercentage / 100);
    const minAllowedFee = Math.round(basePrice * 0.5 * 100) / 100;
    finalFee = Math.max(minAllowedFee, Math.round(discounted * 100) / 100);
  }

  return { discountPercentage, finalFee };
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
