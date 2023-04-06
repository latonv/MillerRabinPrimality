const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised).should();

const { primalityTest } = require("../dist/index.js");

describe("input options", () => {
  it("should correctly label primes with user-specified numRounds", async () => {
    const primes = [
      89n,
      4145835283301077n
    ];
    await Promise.all(primes.map(p =>
      primalityTest(p, { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", true)
    ));
  });

  it("should correctly label composite numbers with user-specified numRounds", async () => {
    const composites = [
      91n,
      41458352833010723n
    ];
    await Promise.all(composites.map(n =>
      primalityTest(n, { numRounds: 8 }).should.eventually.be.an("object").and.have.property("probablePrime", false)
    ));
  });

  it("should correctly use a provided array of bases instead of random bases", async () => {
    // The first eight primes are all strong liars for this composite number...
    await primalityTest(341550071728321n, { bases: [2, 3, 5, 7, 11, 13, 17, 19] })
      .should.eventually.be.an("object").and.have.property("probablePrime", true); 

    // ...but 23 is not!
    await primalityTest(341550071728321n, { bases: [23] })
      .should.eventually.be.an("object").and.have.property("probablePrime", false); 
  });

  it("should ignore the numRounds option when bases is specified", async () => {
    // If it only tests this number with base 2, it should incorrectly label it a probable prime
    // But if it runs 20 tests with random bases, it will almost certainly be found composite
    await primalityTest(341550071728321n, { numRounds: 20, bases: [2] })
      .should.eventually.be.an("object").and.have.property("probablePrime", true);
  });

  it("should throw a TypeError when bases option is not an array", async () => {
    await primalityTest(113n, { bases: 2 }).should.be.rejectedWith(TypeError);
  });

  it("should throw a RangeError when one or more provided bases is out of range", async () => {
    await Promise.all([
      primalityTest(113n, { bases: [1, 2, 3] }).should.be.rejectedWith(RangeError),
      primalityTest(119n, { bases: [500] }).should.be.rejectedWith(RangeError)
    ]);
  });

  it("should correctly label strong pseudoprimes to a given base", async () => {
    // Note: 31697 is a strong pseudoprime to base 3, but should still be correctly labeled as composite
    await primalityTest(31697n, { bases: [3] })
      .should.eventually.be.an("object").and.have.property("probablePrime", false); 
  });

  it("should not return a divisor if findDivisor=false", async () => {
    const composites = [
      95n,
      41458352833010691n
    ];
    await Promise.all(composites.map(n =>
      primalityTest(n, { findDivisor: false }).should.eventually.be.an("object").and.have.property("divisor", null)
    ));
  });
});