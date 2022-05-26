const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised).should();

const { testPrimality } = require("../index.js");

describe("small cases", () => {
  it("should correctly label small odd primes as probable primes", async () => {
    const smallOddPrimes = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
    for (const p of smallOddPrimes) {
      await testPrimality(p).should.eventually.be.an("object").and.have.property("probablePrime", true);
    }
  });

  it("should correctly label small odd composite numbers as composite", async () => {
    const smallOddComposites = [9, 15, 21, 25, 27, 33, 35];
    for (const n of smallOddComposites) {
      await testPrimality(n).should.eventually.be.an("object").and.have.property("probablePrime", false);
    }
  });
});

describe("large cases", () => {
  it("should correctly label large primes as probable primes", async () => {
    const largePrimes = [
      482398747n,
      120371948791827323n,
      18946997824225017722021425122738127657874530527352426816501085067223n
    ];
    for (const p of largePrimes) {
      await testPrimality(p).should.eventually.be.an("object").and.have.property("probablePrime", true);
    }
  });

  it("should correctly label large composite numbers as composite", async () => {
    const largeComposites = [
      565122993n,
      6282987234087503937n,
      83920982304875092830927350109182130197359081723098365091823916821n
    ];
    for (const n of largeComposites) {
      await testPrimality(n).should.eventually.be.an("object").and.have.property("probablePrime", false);
    }
  });
});

describe("different input types", () => {
  it("should correctly label inputs specified as a primitive number", async () => {
    await testPrimality(8327981).should.eventually.be.an("object").and.have.property("probablePrime", false);
    await testPrimality(8327983).should.eventually.be.an("object").and.have.property("probablePrime", true);
  });

  it("should correctly label inputs specified as a string", async () => {
    await testPrimality("8327981").should.eventually.be.an("object").and.have.property("probablePrime", false);
    await testPrimality("8327983").should.eventually.be.an("object").and.have.property("probablePrime", true);
  });

  it("should correctly label inputs specified as a primitive BigInt", async () => {
    await testPrimality(8327981n).should.eventually.be.an("object").and.have.property("probablePrime", false);
    await testPrimality(8327983n).should.eventually.be.an("object").and.have.property("probablePrime", true);
  });
});

describe("check for valid divisors", () => {
  it("should always return p as a divisor when the input is p^2", async () => {
    const primes = [
      101n,
      1203981240941n,
      7382749857293847288803n
    ];
    for (const p of primes) {
      const result = await testPrimality(p ** 2n, { findDivisor: true }); // Future-proofing by specifying the default option
      result.should.be.an("object");
      result.should.have.property("probablePrime", false);
      result.should.have.property("divisor", p);
    }
  });

  it("should always return either no divisor at all or a valid non-trivial divisor of the input", async () => {
    const composites = [14911n, 239875n, 41612447n];
    for (const n of composites) {
      const result = await testPrimality(n, { findDivisor: true }); // Future-proofing by specifying the default option
      result.should.be.an("object");
      result.should.have.property("probablePrime", false);
      result.should.have.property("divisor").not.oneOf([1n, n]); // Divisor should not be 1 or equal to the input
      result.should.satisfy(result => (result.divisor === null) || (n % result.divisor === 0n)); // It's either null or it divides n
    }
  });
});