import { frequencies, isMissing, parseDate, parseNumber } from './values.js?v=6ee401bc68a87739';
import { mean, quantile, standardDeviation } from './statistics.js?v=6ee401bc68a87739';

function inferType(present, numeric) {
  if (!present.length) return 'empty';
  if (numeric.length / present.length >= 0.95) return 'number';
  return present.every(value => parseDate(value) !== null) ? 'date' : 'category';
}

function numericSummary(sorted) {
  const average = mean(sorted);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const margin = 1.5 * (q3 - q1);
  const lo = q1 - margin;
  const hi = q3 + margin;
  return {
    min: sorted[0], max: sorted.at(-1), mean: average, median: quantile(sorted, 0.5),
    sd: standardDeviation(sorted, average), q1, q3, lo, hi,
    outliers: sorted.filter(value => value < lo || value > hi).length,
  };
}

function profileColumn(name, index, rows) {
  const present = rows.map(row => row[index]).filter(value => !isMissing(value));
  const numeric = present.map(parseNumber).filter(value => value !== null);
  const type = inferType(present, numeric);
  const counts = frequencies(present);
  const unique = counts.length;
  const namedIdentifier = /^(id|index|uuid|.*[_ ]id|.*[_ ]code)$/i.test(name);
  const highCardinality = type === 'category' && unique > Math.min(20, present.length * 0.8);
  return {
    name, index, type, unique, counts, idLike: namedIdentifier || highCardinality,
    missing: rows.length - present.length,
    invalid: type === 'number' ? present.length - numeric.length : 0,
    ...(type === 'number' ? numericSummary(numeric.sort((a, b) => a - b)) : {}),
  };
}

export function profile(dataset) {
  const { headers, rows } = dataset;
  const columns = headers.map((name, index) => profileColumn(name, index, rows));
  const distinctRows = new Set(rows.map(row => JSON.stringify(row)));
  return {
    columns, rows: rows.length, cells: rows.length * headers.length,
    missing: columns.reduce((sum, column) => sum + column.missing, 0),
    duplicates: rows.length - distinctRows.size,
  };
}
