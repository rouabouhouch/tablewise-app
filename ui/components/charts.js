import { histogram } from '../../data/statistics.js?v=1919cefb67302b76';
import { html, formatNumber } from '../html.js?v=1919cefb67302b76';
import { barRows, emptyState } from './common.js?v=1919cefb67302b76';

export function histogramChart(rows, column) {
  const bins = histogram(rows.map(row => row[column.index]));
  if (!bins.length) return emptyState('No numeric values to chart.');
  const largest = Math.max(...bins.map(bin => bin.count), 1);
  const left = 37, top = 12, width = 503, height = 172;
  const y = count => top + height - height * count / largest;
  const barWidth = width / bins.length;
  const min = bins[0].start, max = bins.at(-1).end;
  return html`<svg class="chart" viewBox="0 0 550 220" role="img" aria-label="Histogram of ${column.name}">
    ${[0, 0.5, 1].map(fraction => html`
      <line class="axis" x1="${left}" x2="540" y1="${y(largest * fraction)}" y2="${y(largest * fraction)}"/>
      <text x="${left - 8}" y="${y(largest * fraction) + 4}" text-anchor="end">${formatNumber(largest * fraction, 0)}</text>`)}
    ${bins.map((bin, index) => html`<rect class="bar" rx="2"
      x="${left + index * barWidth + 2}" y="${y(bin.count)}"
      width="${barWidth - 5}" height="${height * bin.count / largest}">
      <title>${formatNumber(bin.start)} to ${formatNumber(bin.end)}: ${bin.count} rows</title></rect>`)}
    <text x="${left}" y="210">${formatNumber(min)}</text>
    <text x="${left + width / 2}" y="210" text-anchor="middle">${formatNumber((min + max) / 2)}</text>
    <text x="540" y="210" text-anchor="end">${formatNumber(max)}</text>
  </svg>`;
}

export function categoryChart(column) {
  const top = column.counts.slice(0, 8);
  if (!top.length) return emptyState('This column has no values yet.');
  return html`${barRows(top, top[0][1])}
    <p class="chart-note">${column.unique > 8 && `Top 8 of ${formatNumber(column.unique, 0)} values. `}Missing cells excluded.</p>`;
}

export function scatterChart(points, xLabel, yLabel, identityLine = false) {
  if (points.length < 2) return emptyState('Not enough paired values for this chart.');
  const horizontal = points.map(([x]) => x);
  const vertical = points.map(([, y]) => y);
  let xMin = Math.min(...horizontal), xMax = Math.max(...horizontal);
  let yMin = Math.min(...vertical), yMax = Math.max(...vertical);
  if (identityLine) {
    xMin = yMin = Math.min(xMin, yMin);
    xMax = yMax = Math.max(xMax, yMax);
  }
  if (xMin === xMax) xMax++;
  if (yMin === yMax) yMax++;
  const left = 54, top = 20, width = 508, height = 242;
  const x = value => left + (value - xMin) / (xMax - xMin) * width;
  const y = value => top + height - (value - yMin) / (yMax - yMin) * height;

  return html`<svg class="chart" viewBox="0 0 580 310" role="img" aria-label="${yLabel} compared with ${xLabel}">
    ${[0, 0.25, 0.5, 0.75, 1].map(fraction => {
      const xTick = xMin + fraction * (xMax - xMin), yTick = yMin + fraction * (yMax - yMin);
      return html`<line class="axis" x1="${left}" x2="562" y1="${y(yTick)}" y2="${y(yTick)}"/>
        <text x="45" y="${y(yTick) + 3}" text-anchor="end">${formatNumber(yTick)}</text>
        <text x="${x(xTick)}" y="280" text-anchor="middle">${formatNumber(xTick)}</text>`;
    })}
    ${identityLine && html`<line x1="${x(xMin)}" x2="${x(xMax)}" y1="${y(xMin)}" y2="${y(xMax)}"
      stroke="#b4bd9e" stroke-dasharray="5 5"/>`}
    ${points.map(([a, b]) => html`<circle cx="${x(a)}" cy="${y(b)}" r="3">
      <title>${xLabel}: ${formatNumber(a)}; ${yLabel}: ${formatNumber(b)}</title></circle>`)}
    <text x="${left + width / 2}" y="307" text-anchor="middle">${xLabel}</text>
    <text x="${left}" y="11">${yLabel}</text>
  </svg>`;
}
