# Miller-Rabin Primality Test

> A lightweight module for efficiently primality testing arbitrarily large numbers via the Miller-Rabin algorithm.

Since Miller-Rabin is a probabilistic test, there is a small chance that it could label a composite number as a probable prime (if all tested bases are strong liars).
This chance decreases exponentially as the number of testing rounds is increased, and is already quite small for very large inputs regardless.

A prime number will never be labeled composite by this algorithm (always a probable prime).

Primitive BigInt values are used for arbitrary-size inputs and outputs. Accordingly, this library requires a Node.js or browser version that supports primitive BigInts:

 - Node.js v10.4.0+
 - Firefox v68+
 - Chrome v67+
 - Edge v79+
 - Safari v14+
 - Opera v54+

## Usage

The `primalityTest` function accepts any number, and returns a Promise resolving to a primality result object.
The `probablePrime` property of this object indicates the result of the test on the input `n`.
If `probablePrime` is `false`, then `n` is guaranteed to be composite, and the primality result object will specify a Miller-Rabin `witness` to the compositeness of `n`.
In some cases, a `divisor` of composite `n` will be found, in which case it will also be provided on the result object.

```js
const { primalityTest } = require('primality-test');

primalityTest(91).then((result) => {
  // result should resemble:
  // {
  //   n: BigInt(91),
  //   probablePrime: false,
  //   witness: BigInt(23),
  //   divisor: BigInt(7)
  // }
});

primalityTest(3847201213).then((result) => {
  // result should resemble:
  // {
  //   n: BigInt(3847201213),
  //   probablePrime: true,
  //   witness: null,
  //   divisor: null
  // }
});
```

The input can be provided as a primitive number (like above), a primitive BigInt, or a string:
```js
// All of these are equivalent
primalityTest('2718281828459045235360287471').then(/* ... */);
primalityTest(2718281828459045235360287471n).then(/* ... */);
primalityTest(BigInt('2718281828459045235360287471')).then(/* ... */);
```

### Options

#### `numRounds`

An option is available to specify how many rounds of testing to perform before marking the input as a probable prime.
More rounds of testing will result in a greater likelihood of finding a witness for composite numbers.
If the `numRounds` option is not specified, a reasonable number of rounds will be chosen based on the size of the input.
```js
primalityTest(1234567, { numRounds: 5 }).then(/* ... */);
```

#### `bases`

Alternatively, an array of specific bases to test against can be provided. This `bases` option will override any
`numRounds` value specified, and use exactly the provided bases (i.e., the maximum number of testing rounds will equal `bases.length`).
This option can be useful for attaining 
[deterministic results](https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test#Testing_against_small_sets_of_bases) 
for a given range of inputs.
All of the provided bases must lie within the range `[2, n-2]` (inclusive), or a RangeError will be thrown.
```js
primalityTest(3215031749n, { bases: [2, 3, 5, 7] }).then(/* ... */);
```

#### `findDivisor`

By default, if the input is determined to be composite, an attempt will be made to find a divisor via some relatively 
inexpensive checks (not a full factoring attempt!).
If a divisor is not needed, it is possible to opt out of these checks by setting the `findDivisor` option to `false`.
Note that even with `findDivisor=true` and composite input, a divisor is not always guaranteed to be found.
```js
primalityTest(1234567, { findDivisor: false }).then(/* ... */);
```