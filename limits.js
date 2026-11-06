// Limits apply to both the file picker and the analysis engine.
export const LIMITS = Object.freeze({
  bytes: 10 * 1024 * 1024,
  rows: 20_000,
  columns: 80,
  modelRows: 5_000,
  features: 12,
});
