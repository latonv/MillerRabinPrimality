const ZERO = 0n;
const ONE = 1n;


/**
 * Calculates the length of `n` in bits.
 * 
 * @param {bigint} n Any number
 * @returns {number} The number of bits required to encode `n`
 */
function bitLength(n) {
  // Surprisingly, string conversion seems to be the most performant way to get the bit length of a BigInt at present...
  return n.toString(2).length;
}

/**
 * Calculates the multiplicity of 2 in the prime factorization of `n` -- i.e., how many factors of 2 `n` contains.
 * So if `n = 2^k * d` (where `d` is odd), the returned value would be `k`.
 * 
 * @param {bigint} n Any number
 * @returns {bigint} The multiplicity of 2 in the prime factorization of `n`
 */
function twoMultiplicity(n) {
  if (n === ZERO) return ZERO;

  let m = ZERO;
  while (true) { // Since n is not 0, it must have a leading 1 bit, so this is safe
    if (n & (ONE << m)) return m; // Bail out when we reach the least significant 1 bit
    m++;
  }
}

/**
 * Calculates the gcd of two positive bigints.
 * 
 * @param {bigint} a The first number, which must be positive
 * @param {bigint} b The second number, which must be positive
 * @returns {bigint} gcd(a, b)
 */
function gcd(a, b) {
  if (a === b) return a;
  if (a === ZERO) return b;
  if (b === ZERO) return a;
  
  // Strip out any shared factors of two beforehand (to be re-added at the end)
  let sharedTwoFactors = ZERO;
  while (!(a & ONE | b & ONE)) {
    sharedTwoFactors++;
    a >>= ONE;
    b >>= ONE;
  }
  
  while (a !== b && b > ONE) {
    // Any remaining factors of two in either number are not important and can be shifted away
    while (!(a & ONE)) a >>= ONE;
    while (!(b & ONE)) b >>= ONE;

    // Standard Euclidean algorithm, maintaining a > b and avoiding division
    if (b > a) {
      [a, b] = [b, a];
    } else if (a === b) {
      break;
    }

    a -= b;
  }
  
  // b is the gcd, after re-applying the shared factors of 2 removed earlier
  return b << sharedTwoFactors;
}

/**
 * Calculates the inverse of `2^exp` modulo the given odd `base`.
 * 
 * @param {number} exp The exponent of power of 2 that should be inverted (_not_ the power of 2 itself!)
 * @param {bigint} base The modulus to invert with respect to
 */
function invert(exp, base) {
  // Penk's rshift inversion method, but restricted to powers of 2 and odd bases (which is all we require for Miller-Rabin)
  // Just start from 1 and repeatedly halve, adding the base whenever necessary to remain even.
  let inv = ONE;
  for (let i = 0; i < exp; i++) {
    if (inv & ONE) {
      inv += base;
    }

    inv >>= ONE;
  }
  return inv;
}

/**
 * @typedef MontgomeryReductionContext
 * 
 * An object containing precalculated values for efficiently reducing numbers to their Montgomery forms
 * and performing Montgomery-reduced arithmetic, modulo the given `base`.
 * 
 * @property {bignum} base The modulus of the reduction context
 * @property {bignum} shift The exponent of the power of 2 used for `r` (i.e., `r = 2^shift`)
 * @property {bignum} r The auxiliary modulus for Montgomery reduction, defined as the smallest power of two greater than `base`
 * @property {bignum} rInv The modular inverse of `r` (mod `base`)
 * @property {bignum} baseInv The modular inverse of `base` (mod `r`)
 */
/**
 * Produces a Montgomery reduction context that can be used to define and operate on numbers in Montgomery form
 * for the given base.
 * 
 * @param {bignum} base The modulus of the reduction context. Must be an odd number.
 * @returns {MontgomeryReductionContext}
 */
function reductionContextFor(base) {
  if (!(base & ONE)) throw new Error(`base must be odd`);

  // Select the auxiliary modulus r to be the smallest power of two greater than the base modulus
  const numBits = bitLength(base);
  const littleShift = numBits + 1;
  const shift = BigInt(littleShift);
  const r = ONE << shift;

  // Calculate the modular inverses of r (mod base) and base (mod r)
  const rInv = invert(littleShift, base);
  const baseInv = r - (((rInv * r - ONE) / base) % r); // From base*baseInv + r*rInv = 1  (mod r)

  return { base, shift, r, rInv, baseInv };
}

/**
 * Convert the given number into its Montgomery form, according to the given Montgomery reduction context.
 * 
 * @param {bigint} n Any number
 * @param {MontgomeryReductionContext} ctx 
 * @returns {bigint} The Montgomery form of `n`
 */
function reduce(n, ctx) {
  return (n << ctx.shift) % ctx.base;
}

/**
 * Converts the given number _out_ of Montgomery form, according to the given Montgomery reduction context.
 * 
 * @param {bigint} n A number in Montgomery form
 * @param {MontgomeryReductionContext} ctx 
 * @returns {bigint} The (no longer Montgomery-reduced) number whose Montgomery form was `n`
 */
function invReduce(n, ctx) {
  return (n * ctx.rInv) % ctx.base;
}

/**
 * Squares a number in Montgomery form.
 * 
 * @param {bigint} n A number in Montgomery form
 * @param {MontgomeryReductionContext} ctx 
 * @returns {bigint} The Montgomery-reduced square of `n`
 */
function sqr(n, ctx) {
  return mul(n, n, ctx) % ctx.base;
}

/**
 * Multiplies two numbers in Montgomery form.
 * 
 * @param {bigint} a A number in Montgomery form
 * @param {bigint} b A number in Montgomery form
 * @param {MontgomeryReductionContext} ctx 
 * @returns {bigint} The Montgomery-reduced product of `a` and `b`
 */
function mul(a, b, ctx) {
  if (a === ZERO || b === ZERO) return ZERO;

  const rm1 = ctx.r - ONE;
  let t = a * b;
  const c = (((t & rm1) * ctx.baseInv) & rm1) * ctx.base;
  let product = (t - c) >> ctx.shift;

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
 * @param {MontgomeryReductionContext} ctx 
 * @returns {bigint} The Montgomery-reduced result of taking `n` to exponent `exp`
 */
function pow(n, exp, ctx) {
  // Exponentiation by squaring
  const expLen = BigInt(bitLength(exp));
  let result = reduce(ONE, ctx);
  for (let i = ZERO, x = n; i < expLen; ++i, x = sqr(x, ctx)) {
    if (exp & (ONE << i)) {
      result = mul(result, x, ctx);
    }
  }

  return result;
}

module.exports = { reductionContextFor, reduce, invReduce, sqr, mul, pow, bitLength, twoMultiplicity, gcd };