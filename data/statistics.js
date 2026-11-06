import { parseNumber } from './values.js?v=1919cefb67302b76';

export function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values, average = mean(values)) {
  return Math.sqrt(mean(values.map(value => (value - average) ** 2)));
}

/** Linear interpolation between adjacent ranks in ascending order. */
export function quantile(sorted, fraction) {
  if (!sorted.length) return null;
  const rank = (sorted.length - 1) * fraction;
  const lower = Math.floor(rank);
  return sorted[lower] + (sorted[Math.ceil(rank)] - sorted[lower]) * (rank - lower);
}

export function numericPairs(rows, xColumn, yColumn) {
  const pairs = [];
  for (const row of rows) {
    const x = parseNumber(row[xColumn]);
    const y = parseNumber(row[yColumn]);
    if (x !== null && y !== null) pairs.push([x, y]);
  }
  return pairs;
}

export function correlationOfPairs(pairs) {
  if (pairs.length < 3) return null;
  const meanX = mean(pairs.map(([x]) => x));
  const meanY = mean(pairs.map(([, y]) => y));
  let varianceX = 0;
  let varianceY = 0;
  let covariance = 0;

  for (const [x, y] of pairs) {
    varianceX += (x - meanX) ** 2;
    varianceY += (y - meanY) ** 2;
    covariance += (x - meanX) * (y - meanY);
  }
  if (!varianceX || !varianceY) return null;
  return { r: covariance / Math.sqrt(varianceX * varianceY), n: pairs.length };
}

export function correlation(rows, xColumn, yColumn) {
  return correlationOfPairs(numericPairs(rows, xColumn, yColumn));
}

export function strongestCorrelation(rows, columns) {
  const candidates = columns.filter(column => column.type === 'number' && !column.idLike).slice(0, 20);
  let strongest = null;
  for (const [index, a] of candidates.entries()) {
    for (const b of candidates.slice(index + 1)) {
      const pair = correlation(rows, a.index, b.index);
      if (pair && (!strongest || Math.abs(pair.r) > Math.abs(strongest.r))) {
        strongest = { ...pair, a, b };
      }
    }
  }
  return strongest;
}

export function histogram(values, binCount = 12) {
  const numeric = values.map(parseNumber).filter(value => value !== null);
  if (!numeric.length) return [];
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  if (min === max) return [{ start: min, end: max, count: numeric.length }];

  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: min + index * width, end: min + (index + 1) * width, count: 0,
  }));
  for (const value of numeric) {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width));
    bins[index].count++;
  }
  return bins;
}
