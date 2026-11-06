import { frequencies, isMissing, parseNumber } from '../data/values.js?v=1919cefb67302b76';
import { mean, quantile, standardDeviation } from '../data/statistics.js?v=1919cefb67302b76';

const MAX_LEVELS = 14;
const MAX_STANDARD_SCORE = 20;

export function fitEncoder(trainingRows, columns) {
  const specs = [];
  for (const { index, name, type } of columns) {
    const values = trainingRows.map(row => row[index]);
    if (type === 'number') {
      const sorted = values.map(parseNumber).filter(value => value !== null).sort((a, b) => a - b);
      if (!sorted.length) continue;
      const average = mean(sorted);
      specs.push({ index, name, type, median: quantile(sorted, 0.5), mean: average,
        sd: standardDeviation(sorted, average) || 1 });
    } else {
      const counts = frequencies(values.filter(value => !isMissing(value)));
      const levels = counts.slice(0, MAX_LEVELS).map(([value]) => value);
      if (levels.length) specs.push({ index, name, type, levels });
    }
  }
  if (!specs.length) throw new Error('The selected inputs contain no usable training values.');
  const dimensions = 1 + specs.reduce((sum, spec) => sum + featureWidth(spec), 0);
  if (dimensions > 120) throw new Error('Too many encoded categories. Select fewer categorical inputs.');
  return specs;
}

export function featureWidth(spec) {
  return spec.type === 'number' ? 1 : spec.levels.length + 1;
}

export function encodeRow(row, specs) {
  const vector = [1]; // The first coordinate is the intercept.
  for (const spec of specs) {
    const raw = row[spec.index];
    if (spec.type === 'number') {
      const standardized = ((parseNumber(raw) ?? spec.median) - spec.mean) / spec.sd;
      vector.push(Math.max(-MAX_STANDARD_SCORE, Math.min(MAX_STANDARD_SCORE, standardized)));
    } else {
      const level = isMissing(raw) ? -1 : spec.levels.indexOf(raw);
      for (let index = 0; index < spec.levels.length; index++) vector.push(Number(index === level));
      vector.push(Number(level < 0)); // One shared coordinate for missing or unseen categories.
    }
  }
  return vector;
}
