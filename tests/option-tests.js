const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised).should();

const { testPrimality } = require("../index.js");

describe("input options", () => {
  it("should correctly label primes with user-specified numRounds", async () => {
    const primes = [
      "89",
      "4145835283301077"
    ];
    for (const p of primes) {
      await testPrimality(p, { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", true);
    }
  });

  it("should correctly label composite numbers with user-specified numRounds", async () => {
    const composites = [
      "91",
      "41458352833010723"
    ];
    for (const n of composites) {
      await testPrimality(n, { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", false);
    }
  });

  it("should correctly use a provided array of bases instead of random bases", async () => {
    // The first eight primes are all strong liars for this composite number...
    await testPrimality(341550071728321n, { bases: [2, 3, 5, 7, 11, 13, 17, 19] })
      .should.eventually.be.an("object").and.have.property("probablePrime", true); 

    // ...but 23 is not!
    await testPrimality(341550071728321n, { bases: [23] })
      .should.eventually.be.an("object").and.have.property("probablePrime", false); 
  });

  it("should ignore the numRounds option when bases is specified", async () => {
    // If it only tests this number with base 2, it should incorrectly label it a probable prime
    // But if it runs 20 tests with random bases, it will almost certainly be found composite
    await testPrimality(341550071728321n, { numRounds: 20, bases: [2] })
      .should.eventually.be.an("object").and.have.property("probablePrime", true);
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