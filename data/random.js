// Mulberry32. Keeping the generator and shuffle order stable makes old
// sample files and seeded evaluations reproducible across releases.
export function seeded(seed = 42) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let bits = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    bits ^= bits + Math.imul(bits ^ (bits >>> 7), 61 | bits);
    return ((bits ^ (bits >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(items, seed = 42) {
  const result = [...items];
  const random = seeded(seed);
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
