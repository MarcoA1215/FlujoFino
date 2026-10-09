import { describe, it, expect } from 'vitest';
import { TenantPlanType } from '@finowork/shared-types';
import {
  calculateSubscriptionFee,
  calculateBsEquivalent,
  calculateUsdEquivalent,
  hasAtLeastOnePaymentMethodActive,
} from './pricing';

describe('SaaS Subscription & Currency Exchange Engine (Frontend Logic)', () => {
  describe('Referral Discount Calculations (calculateSubscriptionFee)', () => {
    it('PIONEER account with < 2 referrals pays full base price', () => {
      const res0 = calculateSubscriptionFee(TenantPlanType.PIONEER, 20.0, 0);
      expect(res0.discountPercentage).toBe(0);
      expect(res0.finalFee).toBe(20.0);

      const res1 = calculateSubscriptionFee(TenantPlanType.PIONEER, 20.0, 1);
      expect(res1.discountPercentage).toBe(0);
      expect(res1.finalFee).toBe(20.0);
    });

    it('PIONEER account with >= 2 referrals gets 100% discount ($0 fee)', () => {
      const res2 = calculateSubscriptionFee(TenantPlanType.PIONEER, 20.0, 2);
      expect(res2.discountPercentage).toBe(100);
      expect(res2.finalFee).toBe(0);

      const res5 = calculateSubscriptionFee(TenantPlanType.PIONEER, 20.0, 5);
      expect(res5.discountPercentage).toBe(100);
      expect(res5.finalFee).toBe(0);
    });

    it('REGULAR account receives 10% per referral up to 50%', () => {
      const res1 = calculateSubscriptionFee(TenantPlanType.REGULAR, 20.0, 1);
      expect(res1.discountPercentage).toBe(10);
      expect(res1.finalFee).toBe(18.0);

      const res3 = calculateSubscriptionFee(TenantPlanType.REGULAR, 20.0, 3);
      expect(res3.discountPercentage).toBe(30);
      expect(res3.finalFee).toBe(14.0);

      const res5 = calculateSubscriptionFee(TenantPlanType.REGULAR, 20.0, 5);
      expect(res5.discountPercentage).toBe(50);
      expect(res5.finalFee).toBe(10.0);

      const res9 = calculateSubscriptionFee(TenantPlanType.REGULAR, 20.0, 9);
      expect(res9.discountPercentage).toBe(50);
      expect(res9.finalFee).toBe(10.0);

      // Dynamic floor with custom base price
      const resCustom = calculateSubscriptionFee(TenantPlanType.REGULAR, 30.0, 8);
      expect(resCustom.discountPercentage).toBe(50);
      expect(resCustom.finalFee).toBe(15.0);
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

    it('returns 0 when exchange rate is zero or negative', () => {
      expect(calculateUsdEquivalent(500, 0)).toBe(0);
      expect(calculateUsdEquivalent(500, -10)).toBe(0);
    });
  });

  describe('Payment Method Activation Rules (hasAtLeastOnePaymentMethodActive)', () => {
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
