import { describe, it, expect } from 'vitest';

describe('Lógica de Período de Gracia y Autoactualizaciones (FinoWork)', () => {
  const calculateGracePeriod = (
    firstSeenTime: number,
    graceDays: number,
    mandatory: boolean,
    now: number
  ) => {
    const deadlineTime = firstSeenTime + graceDays * 24 * 60 * 60 * 1000;
    const msRemaining = deadlineTime - now;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const expired = msRemaining <= 0;
    const isStrictlyMandatory = !!mandatory && (graceDays === 0 || expired);
    const canPostpone = !isStrictlyMandatory;

    return {
      daysRemaining,
      expired,
      isStrictlyMandatory,
      canPostpone,
    };
  };

  it('permite posponer y muestra los días restantes cuando la actualización es nueva (Día 1)', () => {
    const now = new Date('2026-10-31T12:00:00Z').getTime();
    const firstSeen = new Date('2026-10-31T12:00:00Z').getTime();
    const result = calculateGracePeriod(firstSeen, 3, true, now);

    expect(result.daysRemaining).toBe(3);
    expect(result.expired).toBe(false);
    expect(result.canPostpone).toBe(true);
    expect(result.isStrictlyMandatory).toBe(false);
  });

  it('permite posponer cuando queda 1 día de gracia restante', () => {
    const firstSeen = new Date('2026-10-29T12:00:00Z').getTime();
    const now = new Date('2026-10-31T12:00:00Z').getTime(); // 2 días después
    const result = calculateGracePeriod(firstSeen, 3, true, now);

    expect(result.daysRemaining).toBe(1);
    expect(result.expired).toBe(false);
    expect(result.canPostpone).toBe(true);
    expect(result.isStrictlyMandatory).toBe(false);
  });

  it('bloquea la posposición (obligatoria) cuando expira el período de gracia y mandatory=true', () => {
    const firstSeen = new Date('2026-10-26T12:00:00Z').getTime();
    const now = new Date('2026-10-31T12:00:00Z').getTime(); // 5 días después (venció gracia de 3)
    const result = calculateGracePeriod(firstSeen, 3, true, now);

    expect(result.daysRemaining).toBe(0);
    expect(result.expired).toBe(true);
    expect(result.canPostpone).toBe(false);
    expect(result.isStrictlyMandatory).toBe(true);
  });

  it('siempre permite posponer si mandatory=false (incluso tras meses)', () => {
    const firstSeen = new Date('2026-08-01T12:00:00Z').getTime();
    const now = new Date('2026-10-31T12:00:00Z').getTime(); // 90 días después
    const result = calculateGracePeriod(firstSeen, 3, false, now);

    expect(result.isStrictlyMandatory).toBe(false);
    expect(result.canPostpone).toBe(true);
  });

  it('si graceDays=0 y mandatory=true es un parche crítico inmediato (sin posposición)', () => {
    const now = new Date('2026-10-31T12:00:00Z').getTime();
    const result = calculateGracePeriod(now, 0, true, now);

    expect(result.isStrictlyMandatory).toBe(true);
    expect(result.canPostpone).toBe(false);
  });
});
