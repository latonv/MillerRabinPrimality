const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised).should();

const { testPrimality } = require("../index.js");

describe("input options", () => {
  it("should correctly mark primes with user-specified numRounds", async () => {
    const primes = [
      "89",
      "4145835283301077"
    ];
    for (const p of primes) {
      await testPrimality(p, { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", true);
    }
  });

  it("should correctly mark composite numbers with user-specified numRounds", async () => {
    const composites = [
      "91",
      "41458352833010723"
    ];
    for (const n of composites) {
      await testPrimality(n, { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", false);
    }
  });

  it("should not return a divisor if findDivisor=false", async () => {
    const composites = [
      "95",
      "41458352833010691"
    ];
    for (const n of composites) {
      await testPrimality(n, { findDivisor: false }).should.eventually.be.an("object").and.have.property("divisor", null);
    }
  });
});