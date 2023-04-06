import {
  invertPowerOfTwo,
  bitLength
} from "./util";

// Some useful BigInt constants
const ZERO = 0n;
const ONE  = 1n;


/**
 * A type containing precalculated values needed to efficiently reduce numbers to/from their Montgomery forms
 * and perform Montgomery-reduced arithmetic, modulo a given `base`.
 */
export interface MontgomeryReductionContext {
  /**
   * The modulus of the reduction context
   */
  base: bigint,

  /**
   * The exponent of the power of 2 used for `r` (i.e., `r = 2^shift`)
   */
  shift: bigint,

  /**
   * The auxiliary modulus for Montgomery reduction, defined as the smallest power of two greater than `base`
   */
  r: bigint,

  /**
   * The modular inverse of `r` (mod `base`)
   */
  rInv: bigint,

  /**
   * The modular inverse of `base` (mod `r`)
   */
  baseInv: bigint
}


/**
 * Produces a Montgomery reduction context that can be used to define and operate on numbers in Montgomery form
 * for the given base.
 * 
 * @param {bigint} base The modulus of the reduction context. Must be an odd number.
 * @returns {MontgomeryReductionContext}
 */
export function getReductionContext(base: bigint): MontgomeryReductionContext {
  if (!(base & ONE)) throw new Error(`base must be odd`);

  // Select the auxiliary modulus r to be the smallest power of two greater than the base modulus
  const numBits = bitLength(base);
  const littleShift = numBits;
  const shift = BigInt(littleShift);
  const r = ONE << shift;

  // Calculate the modular inverses of r (mod base) and base (mod r)
  const rInv = invertPowerOfTwo(littleShift, base);
  const baseInv = r - (((rInv * r - ONE) / base) % r); // From base*baseInv + r*rInv = 1  (mod r)

  return { base, shift, r, rInv, baseInv };
}


/**
 * Convert the given number into its Montgomery form, according to the given Montgomery reduction context.
 * 
 * @param {bigint} n Any number
 * @param {MontgomeryReductionContext} ctx The Montgomery reduction context to reduce into
 * @returns {bigint} The Montgomery form of `n`
 */
export function montgomeryReduce(n: bigint, ctx: MontgomeryReductionContext): bigint {
  return (n << ctx.shift) % ctx.base;
}


/**
 * Converts the given number _out_ of Montgomery form, according to the given Montgomery reduction context.
 * 
 * @param {bigint} n A number in Montgomery form
 * @param {MontgomeryReductionContext} ctx The Montgomery reduction context to reduce out of
 * @returns {bigint} The (no longer Montgomery-reduced) number whose Montgomery form was `n`
 */
export function invMontgomeryReduce(n: bigint, ctx: MontgomeryReductionContext): bigint {
  return (n * ctx.rInv) % ctx.base;
}


/**
 * Squares a number in Montgomery form.
 * 
 * @param {bigint} n A number in Montgomery form
 * @param {MontgomeryReductionContext} ctx The Montgomery reduction context to square within
 * @returns {bigint} The Montgomery-reduced square of `n`
 */
export function montgomerySqr(n: bigint, ctx: MontgomeryReductionContext): bigint {
  return montgomeryMul(n, n, ctx);
}


/**
 * Multiplies two numbers in Montgomery form.
 * 
 * @param {bigint} a A number in Montgomery form
 * @param {bigint} b A number in Montgomery form
 * @param {MontgomeryReductionContext} ctx The Montgomery reduction context to multiply within
 * @returns {bigint} The Montgomery-reduced product of `a` and `b`
 */
export function montgomeryMul(a: bigint, b: bigint, ctx: MontgomeryReductionContext): bigint {
  if (a === ZERO || b === ZERO) return ZERO;

  const rm1 = ctx.r - ONE;
  let unredProduct = a * b;

  const t = (((unredProduct & rm1) * ctx.baseInv) & rm1) * ctx.base;
  let product = (unredProduct - t) >> ctx.shift;

  if (product >= ctx.base) {
    product -= ctx.base;
  } else if (product < ZERO) {
    product += ctx.base;
  }
  
  return product;
}


/**
 * Calculates `n` to the power of `exp` in Montgomery form.
 * While `n` must be in Montgomery form, `exp` should not.
 * 
 * @param {bigint} n A number in Montgomery form; the base of the exponentiation
 * @param {bigint} exp Any number (_not_ in Montgomery form)
 * @param {MontgomeryReductionContext} ctx The Montgomery reduction context to exponentiate within
 * @returns {bigint} The Montgomery-reduced result of taking `n` to exponent `exp`
 */
export function montgomeryPow(n: bigint, exp: bigint, ctx: MontgomeryReductionContext): bigint {
  // Exponentiation by squaring
  const expLen = BigInt(bitLength(exp));
  let result = montgomeryReduce(ONE, ctx);
  for (let i = ZERO, x = n; i < expLen; ++i, x = montgomerySqr(x, ctx)) {
    if (exp & (ONE << i)) {
      result = montgomeryMul(result, x, ctx);
    }
  }

  return result;
}