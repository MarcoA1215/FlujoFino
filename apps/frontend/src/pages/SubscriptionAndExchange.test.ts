import { describe, it, expect } from 'vitest';
import { TenantPlanType } from '@nutrideli/shared-types';

describe('SaaS Subscription & Currency Exchange Engine (Frontend Logic)', () => {
  // Referral Engine math implementation tested in frontend
  function calculateFrontendFee(planType: TenantPlanType, basePrice: number, activeReferrals: number) {
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
      finalFee = Math.max(10, Math.round(discounted * 100) / 100);
    }

    return { discountPercentage, finalFee };
  }

  // Currency exchange calculation
  function calculateBsEquivalent(usdAmount: number, exchangeRate: number): number {
    return Math.round(usdAmount * exchangeRate * 100) / 100;
  }

  function calculateUsdEquivalent(bsAmount: number, exchangeRate: number): number {
    if (exchangeRate <= 0) return 0;
    return Math.round((bsAmount / exchangeRate) * 100) / 100;
  }

  describe('Referral Discount Calculations', () => {
    it('PIONEER account with < 2 referrals pays full base price', () => {
      const res0 = calculateFrontendFee(TenantPlanType.PIONEER, 20.0, 0);
      expect(res0.discountPercentage).toBe(0);
      expect(res0.finalFee).toBe(20.0);

      const res1 = calculateFrontendFee(TenantPlanType.PIONEER, 20.0, 1);
      expect(res1.discountPercentage).toBe(0);
      expect(res1.finalFee).toBe(20.0);
    });

    it('PIONEER account with >= 2 referrals gets 100% discount ($0 fee)', () => {
      const res2 = calculateFrontendFee(TenantPlanType.PIONEER, 20.0, 2);
      expect(res2.discountPercentage).toBe(100);
      expect(res2.finalFee).toBe(0);

      const res5 = calculateFrontendFee(TenantPlanType.PIONEER, 20.0, 5);
      expect(res5.discountPercentage).toBe(100);
      expect(res5.finalFee).toBe(0);
    });

    it('REGULAR account receives 10% per referral up to 50%', () => {
      const res1 = calculateFrontendFee(TenantPlanType.REGULAR, 20.0, 1);
      expect(res1.discountPercentage).toBe(10);
      expect(res1.finalFee).toBe(18.0);

      const res3 = calculateFrontendFee(TenantPlanType.REGULAR, 20.0, 3);
      expect(res3.discountPercentage).toBe(30);
      expect(res3.finalFee).toBe(14.0);

      const res5 = calculateFrontendFee(TenantPlanType.REGULAR, 20.0, 5);
      expect(res5.discountPercentage).toBe(50);
      expect(res5.finalFee).toBe(10.0);

      const res9 = calculateFrontendFee(TenantPlanType.REGULAR, 20.0, 9);
      expect(res9.discountPercentage).toBe(50);
      expect(res9.finalFee).toBe(10.0);
    });
  });

  describe('Exchange Rate Conversions (Pago Móvil & Bs)', () => {
    it('calculates correct Bolívares amount from USD at official rate', () => {
      const rate = 40.0;
      expect(calculateBsEquivalent(20.0, rate)).toBe(800.0);
      expect(calculateBsEquivalent(15.5, rate)).toBe(620.0);
      expect(calculateBsEquivalent(0, rate)).toBe(0);
    });

    it('calculates bidirectional USD equivalent from Bolívares input', () => {
      const rate = 40.0;
      expect(calculateUsdEquivalent(800.0, rate)).toBe(20.0);
      expect(calculateUsdEquivalent(620.0, rate)).toBe(15.5);
    });

    it('handles decimal exchange rates accurately', () => {
      const rate = 46.85;
      const usd = 20.0;
      const expectedBs = Math.round(usd * rate * 100) / 100;
      expect(calculateBsEquivalent(usd, rate)).toBe(expectedBs);
      expect(calculateBsEquivalent(usd, rate)).toBe(937.0);
    });
  });

  describe('Payment Method Activation Rules', () => {
    function hasAtLeastOnePaymentMethodActive(methods: {
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

    it('returns false if all payment methods are deactivated', () => {
      expect(
        hasAtLeastOnePaymentMethodActive({
          cashUsd: false,
          pagoMovil: false,
          cardPos: false,
          binance: false,
          transfer: false,
        }),
      ).toBe(false);
    });

    it('returns true if at least one payment method is active', () => {
      expect(
        hasAtLeastOnePaymentMethodActive({
          cashUsd: false,
          pagoMovil: true,
          cardPos: false,
          binance: false,
          transfer: false,
        }),
      ).toBe(true);
    });
  });
});
