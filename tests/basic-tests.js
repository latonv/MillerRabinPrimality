const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised).should();

const BN = require("bn.js");
const { testPrimality } = require("../index.js");

describe("small cases", () => {
  it("should correctly mark small odd primes as probable primes", async () => {
    const smallOddPrimes = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
    for (const p of smallOddPrimes) {
      await testPrimality(p).should.eventually.be.an("object").and.have.property("probablePrime", true);
    }
  });

  it("should correctly mark small odd composite numbers as composite", async () => {
    const smallOddComposites = [9, 15, 21, 25, 27, 33, 35];
    for (const n of smallOddComposites) {
      await testPrimality(n).should.eventually.be.an("object").and.have.property("probablePrime", false);
    }
  });
});

describe("large cases", () => {
  it("should correctly mark large primes as probable primes", async () => {
    const largePrimes = [
      "482398747",
      "120371948791827323",
      "18946997824225017722021425122738127657874530527352426816501085067223"
    ];
    for (const p of largePrimes) {
      await testPrimality(new BN(p)).should.eventually.be.an("object").and.have.property("probablePrime", true);
    }
  });

  it("should correctly mark large composite numbers as composite", async () => {
    const largeComposites = [
      "565122993",
      "6282987234087503937",
      "83920982304875092830927350109182130197359081723098365091823916821"
    ];
    for (const n of largeComposites) {
      await testPrimality(new BN(n)).should.eventually.be.an("object").and.have.property("probablePrime", false);
    }
  });
});

describe("input options", () => {
  it("should correctly mark primes with user-specified numRounds", async () => {
    const primes = [
      "89",
      "4145835283301077"
    ];
    for (const p of primes) {
      await testPrimality(new BN(p), { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", true);
    }
  });

  it("should correctly mark composite numbers with user-specified numRounds", async () => {
    const composites = [
      "91",
      "41458352833010723"
    ];
    for (const n of composites) {
      await testPrimality(new BN(n), { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", false);
    }
  });

  it("should not return a divisor if findDivisor=false", async () => {
    const composites = [
      "95",
      "41458352833010691"
    ];
    for (const n of composites) {
      await testPrimality(new BN(n), { findDivisor: false }).should.eventually.be.an("object").and.have.property("divisor", null);
    }
  });
});