/**
 * Scaled integer arithmetic helper to prevent IEEE 754 binary floating-point drift.
 * Uses a scale factor of 1,000,000 to perform financial and inventory calculations in integer space.
 */
export class ScaledMath {
  public static readonly SCALE = 1_000_000n;
  public static readonly SCALE_FACTOR = 1_000_000;

  /**
   * Scales a floating point or decimal number to a scaled integer (BigInt).
   */
  public static toScaled(val: number | string | undefined | null): bigint {
    const num = Number(val) || 0;
    return BigInt(Math.round(num * ScaledMath.SCALE_FACTOR));
  }

  /**
   * Converts a scaled BigInt back to a standard JavaScript number without premature truncation.
   */
  public static fromScaled(val: bigint): number {
    return Number(val) / ScaledMath.SCALE_FACTOR;
  }

  /**
   * Scaled addition: a + b
   */
  public static add(a: bigint, b: bigint): bigint {
    return a + b;
  }

  /**
   * Scaled subtraction: a - b
   */
  public static sub(a: bigint, b: bigint): bigint {
    return a - b;
  }

  /**
   * Scaled multiplication: (a * b) / SCALE
   */
  public static mul(a: bigint, b: bigint): bigint {
    return (a * b) / ScaledMath.SCALE;
  }

  /**
   * Scaled division: (a * SCALE) / b
   */
  public static div(a: bigint, b: bigint): bigint {
    if (b === 0n) return 0n;
    return (a * ScaledMath.SCALE) / b;
  }

  /**
   * Convenience helpers operating on numbers using scaled BigInt internally
   */
  public static addNum(a: number, b: number): number {
    return ScaledMath.fromScaled(ScaledMath.add(ScaledMath.toScaled(a), ScaledMath.toScaled(b)));
  }

  public static subNum(a: number, b: number): number {
    return ScaledMath.fromScaled(ScaledMath.sub(ScaledMath.toScaled(a), ScaledMath.toScaled(b)));
  }

  public static mulNum(a: number, b: number): number {
    return ScaledMath.fromScaled(ScaledMath.mul(ScaledMath.toScaled(a), ScaledMath.toScaled(b)));
  }

  public static divNum(a: number, b: number): number {
    return ScaledMath.fromScaled(ScaledMath.div(ScaledMath.toScaled(a), ScaledMath.toScaled(b)));
  }
}
