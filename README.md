# Miller-Rabin Primality Test

> A lightweight module for primality testing arbitrarily large numbers via the Miller-Rabin algorithm.

Uses bn.js for BigNum inputs and outputs.

## Usage

```js
const { primalityTest } = require("primality-test");

primalityTest(91).then((result) => {
  // result should resemble:
  // {
  //   n: BigNum(91),
  //   probablePrime: false,
  //   witness: BigNum(23),
  //   divisor: BigNum(7)
  // }
});

primalityTest(3847201213).then((result) => {
  // result should resemble:
  // {
  //   n: BigNum(3847201213),
  //   probablePrime: true,
  //   witness: null,
  //   divisor: null
  // }
});

// Can provide either numbers or bn.js BigNums as input
const BN = require("bn.js");
primalityTest(new BN("23817247230482304972350984848923821")).then(/* ... */);

// Can specify how many rounds of testing to perform before marking the input as a probable prime.
// If not specified, a reasonable number of rounds will be chosen based on the size of the input.
primalityTest(1234567, 3).then(/* ... */);

// Can opt out of divisor checks if they are not needed; divisor will always be null in this case.
// Note that even with findDivisor=true, a divisor is not guaranteed to be found, even for composite n.
primalityTest(1234567, 3, false).then(/* ... */);
```