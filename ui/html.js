// Only fragments constructed from tagged template literals carry markup.
// Values from a file are escaped whether used in text or a quoted attribute.
class Fragment {
  constructor(markup) { this.markup = markup; }
  toString() { return this.markup; }
}

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function interpolate(value) {
  if (value instanceof Fragment) return value.markup;
  if (Array.isArray(value)) return value.map(interpolate).join('');
  if (value == null || value === false) return '';
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

export function html(parts, ...values) {
  const markup = parts.reduce((result, part, index) => result + part + interpolate(values[index]), '');
  return new Fragment(markup);
}

const formatters = new Map();
export function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return 'N/A';
  if (!formatters.has(digits)) {
    formatters.set(digits, new Intl.NumberFormat('en', { maximumFractionDigits: digits }));
  }
  return formatters.get(digits).format(value);
}

export function formatPercent(fraction) {
  return formatNumber(fraction * 100) + '%';
}
