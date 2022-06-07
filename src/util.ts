// Some useful BigInt constants
const ZERO = 0n;
const ONE  = 1n;


/**
 * Calculates the inverse of `2^exp` modulo the given odd `base`.
 * 
 * @param {number} exp The exponent of the power of 2 that should be inverted (_not_ the power of 2 itself!)
 * @param {bigint} base The modulus to invert with respect to
 * @returns {bigint}
 */
 function invertPowerOfTwo(exp: number, base: bigint): bigint {
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
 * Calculates the multiplicity of 2 in the prime factorization of `n` -- i.e., how many factors of 2 `n` contains.
 * So if `n = 2^k * d` and `d` is odd, the returned value would be `k`.
 * 
 * @param {bigint} n Any number
 * @returns {bigint} The multiplicity of 2 in the prime factorization of `n`
 */
function twoMultiplicity(n: bigint): bigint {
  if (n === ZERO) return ZERO;

  let m = ZERO;
  while (true) { // Since n is not 0, it must have a leading 1 bit, so this is safe
    if (n & (ONE << m)) return m; // Bail out when we reach the least significant 1 bit
    m++;
  }
}


/**
 * Calculates the length of `n` in bits.
 * 
 * @param {bigint} n Any positive integer
 * @returns {number} The number of bits required to encode `n`
 */
function bitLength(n: bigint): number {
  // Surprisingly, string conversion seems to be the most performant way to get the bit length of a BigInt at present...
  return n.toString(2).length;
}


/**
 * Produces a string of random bits with the specified length.
 * Mainly useful as input to BigInt constructors that take digit strings of arbitrary length.
 * 
 * @param {number} numBits How many random bits to return.
 * @returns {string} A string of `numBits` random bits.
 */
function getRandomBitString(numBits: number): string {
  let bits = "";
  while (bits.length < numBits) {
    bits += Math.random().toString(2).substring(2, 50);
  }
  return bits.substring(0, numBits);
}

export { invertPowerOfTwo, twoMultiplicity, bitLength, getRandomBitString };