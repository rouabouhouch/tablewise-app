// Stable public API for consumers importing core.js from the published site.
export { LIMITS } from './limits.js';
export { isMissing as missing, parseNumber as number, parseDate as dateNumber } from './data/values.js';
export { parseCSV, csvText } from './data/csv.js';
export { profile } from './data/profile.js';
export { quantile, correlation, histogram } from './data/statistics.js';
export { seeded } from './data/random.js';
export { demoData } from './data/sample.js';
export { train } from './ml/pipeline.js';
export { predict } from './ml/inference.js';
