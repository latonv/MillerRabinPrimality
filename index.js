const BN = require("bn.js");
const mont = require("./montgomery.js");
const ONE = new BN("1");
const TWO = new BN("2");

/**
 * @typedef MillerRabinResultOptions
 * @property {BN} n The primality-tested number to which the result applies
 * @property {boolean} probablePrime Whether `n` is a probable prime
 * @property {BN?} witness An optional witness to the compositeness of `n`, if one exists
 * @property {BN?} divisor An optional divisor of `n`, if one exists and was found during testing
 */
/**
 * A record class to hold the results of Miller-Rabin testing.
 */
class MillerRabinResult {
  /**
   * Constructs a result object from the given options
   * @param {MillerRabinResultOptions} options
   */
  constructor({ n, probablePrime, witness=null, divisor=null } = {}) {
    this.n = n;
    this.probablePrime = probablePrime;
    this.witness = witness;
    this.divisor = divisor;
  }
}

/**
 * Produces a string of random bits with the specified length.
 * Mainly useful as input to BigNumber constructors that take digit strings of arbitrary length.
 * 
 * @param {number} numBits How many random bits to return.
 * @returns {string} A string of `numBits` random bits.
 */
function getRandomBitString(numBits) {
  let bits = "";
  while (bits.length < numBits) {
    bits += Math.random().toString(2).substring(2, 50);
  }
  return bits.substring(0, numBits);
}

/**
 * Determines an appropriate number of Miller-Rabin testing rounds to perform based on the size of the
 * input number being tested. Larger numbers generally require fewer rounds to maintain a given level
 * of accuracy.
 * 
 * @param {number} inputBits The number of bits in the input number.
 * @returns {number} How many rounds of testing to perform.
 */
function getAdaptiveNumRounds(inputBits) {
  if (inputBits > 1000) return 2;
  else if (inputBits > 500) return 3;
  else if (inputBits > 250) return 4;
  else if (inputBits > 150) return 5;
  else return 6;
}

/**
 * @typedef MillerRabinOptions
 * @property {number?} numRounds A positive integer specifying the number of bases to test against.
 *   If none is provided, a reasonable number of rounds will be chosen automatically to balance speed and accuracy.
 * @property {boolean?} findDivisor Whether to calculate and return a divisor of `n` in certain cases where this is possible (not guaranteed).
 *   Set this to false to avoid extra calculations if a divisor is not needed. Defaults to `true`.
 */
/**
 * Runs Miller-Rabin primality tests on `n` using `rounds` different bases, to determine with high probability whether `n` is a prime number.
 * 
 * Note that Miller-Rabin tests are not guaranteed to produce correct results for even `n`, so a quick trial division to remove factors of 2
 * is advised before turning to this algorithm. To avoid erroneous results, even input will simply short-circuit to a result with `divisor`
 * equal to 2, with no tests being performed.
 * 
 * @param {number|string|BN} n A non-negative odd integer (or string representation thereof) to be tested for primality.
 * @param {MillerRabinOptions?} options An object specifying the `numRounds` and/or `findDivisor` options.
 *   - `numRounds` is a positive integer specifying the number of bases to test against.
 *    If none is provided, a reasonable number of rounds will be chosen automatically to balance speed and accuracy.
 *   - `findDivisor` is a boolean specifying whether to calculate and return a divisor of `n` in certain cases where this is
 *    easily possible (not guaranteed). Set this to false to avoid extra calculations if a divisor is not needed. Defaults to `true`.
 * @returns {Promise<MillerRabinResult>} A result object containing properties
 *   - `n` (the input value, as a BigNumber),
 *   - `probablePrime` (true if all the primality tests passed, false otherwise),
 *   - `witness` (a BigNumber witness for the compositeness of `n`, or null if none was found),
 *   - `divisor` (a BigNumber divisor of `n`, or null if no such divisor was found)
 */
function testPrimality(n, { numRounds=undefined, findDivisor=true } = {}) {
  return new Promise((resolve, reject) => {
    try {
      n = BigInt(n); //new BN(n);

      // Handle some small special cases
      if (n < 2n /*n.ltn(2)*/) { // n = 0 or 1
        resolve(new MillerRabinResult({ n, probablePrime: false, witness: null, divisor: null }));
        return;
      } else if (n < 4n /*n.ltn(4)*/) { // n = 2 or 3
        resolve(new MillerRabinResult({ n, probablePrime: true, witness: null, divisor: null }));
        return;
      } else if (!(n & 1n) /*n.isEven()*/) { // Quick short-circuit for other even n
        resolve(new MillerRabinResult({ n, probablePrime: false, witness: null, divisor: 2n /*TWO.clone()*/ }));
        return;
      }

      const nBits = mont.bitLength(n); //n.bitLength();
      const nSub = n - 1n; //n.subn(1);

      const r = mont.twoMultiplicity(nSub, nBits); //nSub.zeroBits();              // Multiplicity of prime factor 2 in the prime factorization of n-1
      const d = nSub >> r; //nSub.div(TWO.pow(new BN(r))); // The result of factoring out all powers of 2 from n-1
      
      // Convert into a Montgomery reduction context for faster modular exponentiation
      const reductionContext = mont.mont(n); //BN.mont(n);
      const oneReduced = mont.reduce(1n, reductionContext); //ONE.toRed(reductionContext);   // The number 1 in the reduction context
      const nSubReduced = mont.reduce(nSub, reductionContext); //nSub.toRed(reductionContext); // The number n-1 in the reduction context

      // If the number of testing rounds was not provided, pick a reasonable one based on the size of n
      // Larger n have a vanishingly small chance to be falsely labelled probable primes, so we can balance speed and accuracy accordingly
      if (numRounds == null || numRounds < 1) {
        numRounds = getAdaptiveNumRounds(nBits);
      }

      let probablePrime = true;
      let witness = null;
      let divisor = null;

      outer:
      for (let round = 0; round < numRounds; round++) {
        // Select a random base to test
        let base;
        do {
          base = BigInt("0b" + getRandomBitString(nBits)); //new BN(getRandomBitString(nBits), 2);
        } while (!(base > 2n) || !(base < nSub) /*!base.gtn(2) || !base.lt(nSub)*/); // The base must lie within [2, n-2]

        // Check whether the chosen base has any factors in common with n (if so, we can end early)
        if (findDivisor) {
          const gcd = mont.gcd(n, base); //n.gcd(base);
          if (gcd !== 1n /*!gcd.eqn(1)*/) {
            probablePrime = false;
            witness = base;
            divisor = gcd;
            break; // Found a factor of n, so no need for further primality tests
          }
        }

        const baseReduced = mont.reduce(base, reductionContext); //base.toRed(reductionContext);
        let x = mont.pow(baseReduced, d, reductionContext); //baseReduced.redPow(d);
        if (x === oneReduced || x === nSubReduced /*x.eq(oneReduced) || x.eq(nSubReduced)*/) continue; // The test passed: base^d = +/-1 (mod n)

        // Perform the actual Miller-Rabin loop
        let i;
        for (i = 0n; i < r; i++) {
          x = mont.sqr(x, reductionContext); //x.redISqr();
          if (x === oneReduced /*x.eq(oneReduced)*/) {
            probablePrime = false;  // The test failed: base^(d*2^j) = 1 (mod n) and thus cannot be -1 for any j
            witness = base;         // So this base is a witness to the guaranteed compositeness of n
            if (findDivisor) {
              divisor = mont.gcd(mont.invReduce(x, reductionContext) - 1n, n); //x.fromRed().subn(1).gcd(n);
              if (divisor === 1n /*divisor.eqn(1)*/) divisor = null;
            }
            break outer;
          } else if (x === nSubReduced /*x.eq(nSubReduced)*/) {
            // The test passed: base^(d*2^j) = -1 (mod n) for the current j
            // So n is a strong probable prime to this base (though n may still be composite)
            break;
          }
        }

        if (i === r) {
          probablePrime = false;
          witness = base;
          if (findDivisor) {
            x = mont.sqr(x, reductionContext); //x.redISqr();
            divisor = mont.gcd(mont.invReduce(x, reductionContext) - 1n, n); //x.fromRed().subn(1).gcd(n);
            if (divisor === 1n /*divisor.eqn(1)*/) divisor = null;
          }
          break;
        }
      }

      resolve(new MillerRabinResult({ n, probablePrime, witness, divisor }));

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { testPrimality };
