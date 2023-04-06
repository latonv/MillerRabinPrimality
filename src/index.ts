import {
  getReductionContext,
  montgomeryReduce,
  invMontgomeryReduce,
  montgomerySqr,
  montgomeryPow
} from "./montgomery";

import {
  twoMultiplicity,
  bitLength,
  getRandomBitString
} from "./util";


// Some useful BigInt constants
const ZERO = 0n;
const ONE  = 1n;
const TWO  = 2n;
const FOUR = 4n;
const NEG_ONE = -1n;


/**
 * A union of types that can be resolved to a primitive bigint: `number`, `string`, or `bigint` itself.
 */
type BigIntResolvable = number | string | bigint;


/**
 * The available options to the primalityTest function.
 */
export interface PrimalityTestOptions {
  /**
   * A positive integer specifying the number of random bases to test against.
   * If none is provided, a reasonable number of rounds will be chosen automatically to balance speed and accuracy.
   */
  numRounds?: number,
 
  /**
   * An array of integers (or string representations thereof) to use as the
   * bases for Miller-Rabin testing. If this option is specified, the `numRounds` option will be ignored, 
   * and the maximum number of testing rounds will equal `bases.length` (one round for each given base).
   * 
   * Every base provided must lie within the range [2, n-2] (inclusive) or a RangeError will be thrown.
   * If `bases` is specified but is not an array, a TypeError will be thrown.
   */
  bases?: BigIntResolvable[],

  /**
   * Whether to calculate and return a divisor of `n` in certain cases where this is possible (not guaranteed).
   * Set this to false to avoid extra calculations if a divisor is not needed. Defaults to `true`.
   */
  findDivisor?: boolean
}

/**
 * Options passed to the internal PrimalityResult constructor.
 */
interface PrimalityResultOptions {
  /**
   * The primality-tested number to which the result applies
   */
  n: bigint,
  
  /**
   * Whether `n` is a probable prime
   */
  probablePrime: boolean,

  /**
   * An optional witness to the compositeness of `n`, if one exists
   */
  witness?: bigint,

  /**
   * An optional divisor of `n`, if one exists and was found during testing
   */
  divisor?: bigint
}

/**
 * A record class to hold the results of primality testing.
 */
class PrimalityResult {
  /**
   * The primality-tested number to which the result applies
   */
  public n: bigint;

  /**
   * Whether `n` is a probable prime
   */
  public probablePrime: boolean;

  /**
   * An optional witness to the compositeness of `n`, if one exists
   */
  public witness?: bigint;

  /**
   * An optional divisor of `n`, if one exists and was found during testing
   */
  public divisor?: bigint;

  /**
   * Constructs a result object from the given options
   * @param {PrimalityResultOptions} options
   */
  constructor({ n, probablePrime, witness=null, divisor=null }: PrimalityResultOptions) {
    this.n = n;
    this.probablePrime = probablePrime;
    this.witness = witness;
    this.divisor = divisor;
  }
}


/**
 * Calculates the gcd of two positive bigints.
 * 
 * @param {bigint} a The first number (must be positive)
 * @param {bigint} b The second number (must be positive)
 * @returns {bigint} gcd(a, b)
 */
function ugcd(a: bigint, b: bigint): bigint {
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
    // Any remaining factors of two in either number are not important to the gcd and can be shifted away
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
 * Determines an appropriate number of Miller-Rabin testing rounds to perform based on the size of the
 * input number being tested. Larger numbers generally require fewer rounds to maintain a given level
 * of accuracy.
 * 
 * @param {number} inputBits The number of bits in the input number.
 * @returns {number} How many rounds of testing to perform.
 */
function getAdaptiveNumRounds(inputBits: number): number {
  if (inputBits > 1000) return 2;
  else if (inputBits > 500) return 3;
  else if (inputBits > 250) return 4;
  else if (inputBits > 150) return 5;
  else return 6;
}


/**
 * Ensures that all bases in the given array are valid for use in Miller-Rabin tests on the number `n = nSub + 1`.
 * A base is valid if it is an integer in the range [2, n-2].
 * 
 * If `bases` is null or undefined, it is ignored and null is returned.
 * If `bases` is an array of valid bases, they will be returned as a new array, all coerced to BigInts.
 * Otherwise, a RangeError will be thrown if any of the bases are outside the valid range, or a TypeError will
 * be thrown if `bases` is neither an array nor null/undefined.
 * 
 * @param {BigIntResolvable[] | null} bases The array of bases to validate
 * @param {bigint} nSub One less than the number being primality tested
 * @returns {bigint[] | null} An array of BigInts provided all bases were valid, or null if the input was null
 */
function validateBases(bases: BigIntResolvable[] | null, nSub: bigint): bigint[] | null {
  if (bases == null) {
    return null;
  } else if (Array.isArray(bases)) {
    // Ensure all bases are valid BigInts within [2, n-2]
    return bases.map(b => {
      if (typeof b !== "bigint") {
        b = BigInt(b);
      }

      if (!(b >= TWO) || !(b < nSub)) {
        throw new RangeError(`invalid base (must be in the range [2, n-2]): ${b}`);
      }

      return b;
    });
  } else {
    throw new TypeError(`invalid bases option (must be an array)`);
  }
}


/**
 * Runs Miller-Rabin primality tests on `n` using randomly-chosen bases, to determine with high probability whether `n` is a prime number.
 * 
 * @param {BigIntResolvable} n An integer (or string representation thereof) to be tested for primality.
 * @param {PrimalityTestOptions?} options An object specifying the `numRounds` and/or `findDivisor` options.
 *   - `numRounds` is a positive integer specifying the number of random bases to test against.
 *    If none is provided, a reasonable number of rounds will be chosen automatically to balance speed and accuracy.
 *   - `bases` is an array of integers to use as the bases for Miller-Rabin testing. If this option
 *    is specified, the `numRounds` option will be ignored, and the maximum number of testing rounds will equal `bases.length` (one round
 *    for each given base). Every base provided must lie within the range [2, n-2] (inclusive) or a RangeError will be thrown.
 *    If `bases` is specified but is not an array, a TypeError will be thrown.
 *   - `findDivisor` is a boolean specifying whether to calculate and return a divisor of `n` in certain cases where this is
 *    easily possible (not guaranteed). Set this to false to avoid extra calculations if a divisor is not needed. Defaults to `true`.
 * @returns {Promise<PrimalityResult>} A result object containing properties
 *   - `n` (the input value, as a BigInt),
 *   - `probablePrime` (true if all the primality tests passed, false otherwise),
 *   - `witness` (a BigInt witness for the compositeness of `n`, or null if none was found),
 *   - `divisor` (a BigInt divisor of `n`, or null if no such divisor was found)
 */
export function primalityTest(n: BigIntResolvable, { numRounds=undefined, bases=undefined, findDivisor=true }: PrimalityTestOptions = {}): Promise<PrimalityResult> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof n !== "bigint") {
        n = BigInt(n);
      }

      // Ensure n is positive, but keep track of whether the input was originally negative
      const sign = (n < ZERO ? NEG_ONE : ONE); // Just considering zero to have a positive sign, for simplicity's sake
      if (sign === NEG_ONE) {
        n = -n;
      }

      // Handle some small special cases
      if (n < TWO) { // n = 0 or 1
        resolve(new PrimalityResult({ n: sign * n, probablePrime: false, witness: null, divisor: null }));
        return;
      } else if (n < FOUR) { // n = 2 or 3
        resolve(new PrimalityResult({ n: sign * n, probablePrime: true, witness: null, divisor: null }));
        return;
      } else if (!(n & ONE)) { // Quick short-circuit for other even n
        resolve(new PrimalityResult({ n: sign * n, probablePrime: false, witness: null, divisor: TWO }));
        return;
      }

      const nBits = bitLength(n);
      const nSub = n - ONE;

      // Represent n-1 as d * 2^r, with d odd
      const r = twoMultiplicity(nSub); // Multiplicity of prime factor 2 in the prime factorization of n-1
      const d = nSub >> r; // The result of factoring out all powers of 2 from n-1
      
      // Convert into a Montgomery reduction context for faster modular exponentiation
      const reductionContext = getReductionContext(n);
      const oneReduced = montgomeryReduce(ONE, reductionContext); // The number 1 in the reduction context
      const nSubReduced = montgomeryReduce(nSub, reductionContext); // The number n-1 in the reduction context

      // Either use the user-provided list of bases to test against, or determine how many random bases to test
      const validBases = validateBases(bases, nSub);
      if (validBases != null) {
        numRounds = validBases.length;
      } else if (numRounds == null || numRounds < 1) {
        // If the number of testing rounds was not provided, pick a reasonable one based on the size of n
        // Larger n have a vanishingly small chance to be falsely labelled probable primes, so we can balance speed and accuracy accordingly
        numRounds = getAdaptiveNumRounds(nBits);
      }

      let probablePrime = true;
      let witness = null;
      let divisor = null;
      let baseIndex = 0; // Only relevant if the user specified a list of bases to use

      outer:
      for (let round = 0; round < numRounds; round++) {
        let base;
        if (validBases != null) {
          // Use the next user-specified base
          base = validBases[baseIndex];
          baseIndex++;
        } else {
          // Select a random base to test
          do {
            base = BigInt("0b" + getRandomBitString(nBits));
          } while (!(base >= TWO) || !(base < nSub)); // The base must lie within [2, n-2]
        }

        // Check whether the chosen base has any factors in common with n (if so, we can end early)
        if (findDivisor) {
          const gcd = ugcd(n, base);
          if (gcd !== ONE) {
            probablePrime = false;
            witness = base;
            divisor = gcd;
            break; // Found a factor of n, so no need for further primality tests
          }
        }

        const baseReduced = montgomeryReduce(base, reductionContext);
        let x = montgomeryPow(baseReduced, d, reductionContext);
        if (x === oneReduced || x === nSubReduced) continue; // The test passed: base^d = +/-1 (mod n)
        
        // Perform the actual Miller-Rabin loop
        let i, y;
        for (i = ZERO; i < r; i++) {
          y = montgomerySqr(x, reductionContext);

          if (y === oneReduced) {
            probablePrime = false;  // The test failed: base^(d*2^i) = 1 (mod n) and thus cannot be -1 for any i
            witness = base;         // So this base is a witness to the guaranteed compositeness of n
            if (findDivisor) {
              divisor = ugcd(invMontgomeryReduce(x, reductionContext) - ONE, n);
              if (divisor === ONE) divisor = null;
            }
            break outer;
          } else if (y === nSubReduced) {
            // The test passed: base^(d*2^i) = -1 (mod n) for the current i
            // So n is a strong probable prime to this base (though n may still be composite)
            break;
          }

          x = y;
        }

        // No value of i satisfied base^(d*2^i) = +/-1 (mod n)
        // So this base is a witness to the guaranteed compositeness of n
        if (i === r) {
          probablePrime = false;
          witness = base;
          if (findDivisor) {
            divisor = ugcd(invMontgomeryReduce(x, reductionContext) - ONE, n);
            if (divisor === ONE) divisor = null;
          }
          break;
        }
      }

      resolve(new PrimalityResult({ n: sign * n, probablePrime, witness, divisor }));

    } catch (err) {
      reject(err);
    }
  });
}
