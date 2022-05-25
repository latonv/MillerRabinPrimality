
function bitLength(n) {
  return n.toString(2).length;
}

function twoMultiplicity(n) {
  if (n === 0n) return 0n;

  let m = 0n;
  while (true) { // Since n is not 0, it must have a leading 1 bit so this is safe
    if (n & (1n << m)) return m; // Bail out when we reach the least significant 1 bit
    m++;
  }
}

function gcd(a, b) {
  if (a === b) return a;
  if (a === 0n) return b;
  if (b === 0n) return a;
  
  let sharedTwoFactors = 0n;
  while (!(a & 1n | b & 1n)) {
    sharedTwoFactors++;
    a >>= 1n;
    b >>= 1n;
  }
  
  while (a !== b && b > 1n) {
    while (!(a & 1n)) a >>= 1n;
    while (!(b & 1n)) b >>= 1n;

    if (b > a) {
      [a, b] = [b, a];
    } else if (a === b) {
      break;
    }

    a -= b;
  }
  
  return b << sharedTwoFactors;
}

// Extended Euclidean Algorithm inversion
function invert(a, n) {
  if (n < 1) throw new Error(`n must be positive`);

  let t = 0n;
  let newT = 1n;
  let r = n;
  let newR = a;

  while (newR > 0n) {
    let q = r / newR;
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }

  if (r > 1n) {
    throw new Error(`${a} has no inverse modulo ${n}`);
  }

  if (t < 0n) {
    t += n;
  }

  return t;
}

// Penk's rshift inversion
function invert2(a, n) {
  if (n < 1) throw new Error(`n must be positive`);

  let u = n;
  let v = a;
  let r = 0n;
  let s = 1n;

  while (v > 0n) {
    if (!(u & 1n)) {
      if ((r & 1n)) {
        r += n;
      }

      u >>= 1n;
      r >>= 1n;
    } else if (!(v & 1n)) {
      if ((s & 1n)) {
        s += n;
      }

      v >>= 1n;
      s >>= 1n;
    } else {
      let x = u - v;
      if (x > 0n) {
        u = x;
        r -= s;
        if (r < 0n) {
          r += n;
        } else {
          v = -x;
          s -= r;
          if (s < 0n) s += n;
        }
      }
    }

    if (r >= n) r -= n;
    if (r < 0n) r += n;

    return r;
  }
}

// Penk's-esque, but restricted to powers of 2
function invert3(shift, base) {
  let inv = 1n;
  for (let i = 0; i < shift; i++) {
    if (inv & 1n) {
      inv += base;
    }

    inv >>= 1n;
  }
  return inv;
}

function mont(base) {
  if (!(base & 1n)) throw new Error(`base must be odd`);

  const numBits = bitLength(base);
  const littleShift = numBits + 1;
  const shift = BigInt(littleShift);
  const r = 1n << shift;
  const rInv = invert3(littleShift, base);
  const baseInv = r - ((((rInv * r) - 1n) / base) % r);

  return { base, shift, r, rInv, baseInv };
}

function reduce(a, ctx) {
  return (a << ctx.shift) % ctx.base;
}

function invReduce(a, ctx) {
  return (a * ctx.rInv) % ctx.base;
}

function sqr(a, ctx) {
  return mul(a, a, ctx) % ctx.base;
}

function mul(a, b, ctx) {
  if (a === 0n || b === 0n) return 0n;

  const rm1 = ctx.r - 1n;
  let t = a * b;
  let c = (((t & rm1) * ctx.baseInv) & rm1) * ctx.base;
  t = (t - c) >> ctx.shift;
  let res = t;

  if (res >= ctx.base) {
    res -= ctx.base;
  } else if (res < 0) {
    res += ctx.base;
  }
  
  return res;
}

function pow(a, b, ctx) {
  // Exponentiation by squaring
  const expLen = BigInt(bitLength(b));
  let result = reduce(1n, ctx);
  for (let i = 0n, x = a; i < expLen; ++i, x = sqr(x, ctx)) {
    if (b & (1n << i)) {
      result = mul(result, x, ctx);
    }
  }

  return result;
}

module.exports = { mont, reduce, invReduce, sqr, mul, pow, bitLength, twoMultiplicity, gcd };