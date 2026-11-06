const MISSING_MARKER = /^(?:|na|n\/a|null|nan)$/i;
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;

export function isMissing(value) {
  return value == null || MISSING_MARKER.test(String(value).trim());
}

export function parseNumber(value) {
  if (isMissing(value)) return null;
  const text = String(value).trim();
  if (!DECIMAL.test(text)) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value) {
  if (!ISO_DATE.test(String(value))) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;

  // Reject dates normalized by Date.parse, for example February 30.
  const calendarDate = new Date(time).toISOString().slice(0, 10);
  return calendarDate === String(value).slice(0, 10) ? time : null;
}

export function frequencies(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort((left, right) => right[1] - left[1]);
}
