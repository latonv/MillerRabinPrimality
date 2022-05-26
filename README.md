# Miller-Rabin Primality Test

> A lightweight module for primality testing arbitrarily large numbers via the Miller-Rabin algorithm.

Since Miller-Rabin is a probabilistic test, there is a small chance that it could label a composite number as a probable prime (if all tested bases are strong liars).
This chance decreases exponentially as the number of testing rounds is increased, and is already quite small for very large inputs regardless.

A prime number will never be labeled composite by this algorithm (always a probable prime).

Primitive BigInt values are used for arbitrary-size inputs and outputs. Accordingly, this library requires a Node.js or browser version that supports primitive BigInts.

## Usage

```js
const { primalityTest } = require("primality-test");

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

The input can be provided as a primitive number (as above), a primitive BigInt, or a string:
```js
// All of these are equivalent
primalityTest("2718281828459045235360287471").then(/* ... */);
primalityTest(2718281828459045235360287471n).then(/* ... */);
primalityTest(BigInt("2718281828459045235360287471")).then(/* ... */);
```

An option is available to specify how many rounds of testing to perform before marking the input as a probable prime.
More rounds of testing will result in a greater likelihood of finding a witness for composite numbers.
If the `numRounds` option is not specified, a reasonable number of rounds will be chosen based on the size of the input.
```js
primalityTest(1234567, { numRounds: 5 }).then(/* ... */);
```

By default, an attempt will be made to find a divisor for composite input via some relatively inexpensive checks (not a full factoring attempt!).
If a divisor is not needed, it is possible to opt out of these checks by setting the `findDivisor` option to `false`.
Note that even with `findDivisor=true`, a divisor is not always guaranteed to be found, even for composite `n`.
```js
primalityTest(1234567, { findDivisor: false }).then(/* ... */);
```