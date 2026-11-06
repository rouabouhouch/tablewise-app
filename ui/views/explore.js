import { numericPairs, correlationOfPairs } from '../../data/statistics.js?v=1919cefb67302b76';
import { html, formatNumber as fmt } from '../html.js?v=1919cefb67302b76';
import { selectField, columnChoices, panelTitle, emptyState } from '../components/common.js?v=1919cefb67302b76';
import { histogramChart, scatterChart, categoryChart } from '../components/charts.js?v=1919cefb67302b76';

function distribution(rows, column) {
  const entries = [['Distinct values', fmt(column.unique, 0)], ['Missing cells', fmt(column.missing, 0)]];
  const numeric = column.type === 'number';
  if (numeric) entries.push(
    ['Minimum', fmt(column.min, 3)], ['Median', fmt(column.median, 3)], ['Mean', fmt(column.mean, 3)],
    ['Maximum', fmt(column.max, 3)], ['Standard deviation', fmt(column.sd, 3)],
    ['IQR outliers', fmt(column.outliers, 0)], ['Non-numeric cells', fmt(column.invalid, 0)],
  );
  return html`<div class="grid-two">
    <div>${panelTitle(column.name, numeric ? 'Numeric distribution' : 'Most frequent values')}
      ${numeric ? histogramChart(rows, column) : categoryChart(column)}</div>
    <div>${panelTitle('Column summary', '', column.type)}
      <table><tbody>${entries.map(([key, value]) => html`<tr><td>${key}</td><td class="align-end">${value}</td></tr>`)}</tbody></table>
    </div></div>`;
}

function relationship(rows, x, y) {
  const pairs = numericPairs(rows, x.index, y.index);
  const stride = Math.max(1, Math.ceil(pairs.length / 500));
  const points = pairs.filter((_, index) => index % stride === 0);
  return html`<div class="grid-two">
    <div>${scatterChart(points, x.name, y.name)}
      <p class="chart-note">Showing ${points.length} of ${fmt(pairs.length, 0)} paired rows using evenly spaced sampling.</p></div>
    <div><div class="model-stat"><span>Pearson correlation</span><strong>${fmt(correlationOfPairs(pairs)?.r, 3)}</strong>
      <small>Calculated using all valid pairs</small></div>
      <p class="methodology">Values near +1 mean the columns tend to rise together. Near −1, one tends to fall as the other rises.
        A value near zero indicates little linear association. Correlation does not establish cause.</p></div></div>`;
}

export function exploreView({ dataset, summary: { columns }, explore }) {
  const numeric = columns.filter(column => column.type === 'number');
  const isDistribution = explore.mode === 'distribution';
  const choices = [{ value: 'distribution', label: 'Column distribution' }, { value: 'relationship', label: 'Relationship' }];
  const controls = html`<div class="controls">${selectField('chart-mode', 'View', choices, explore.mode)}
    ${isDistribution
      ? selectField('explore-col', 'Column', columnChoices(columns), explore.column)
      : [selectField('scatter-x', 'Horizontal axis', columnChoices(numeric), explore.x),
         selectField('scatter-y', 'Vertical axis', columnChoices(numeric), explore.y)]}
  </div>`;
  let chart;
  if (isDistribution) chart = distribution(dataset.rows, columns[explore.column]);
  else if (numeric.length < 2) chart = emptyState('Relationships need at least two numeric columns.');
  else chart = relationship(dataset.rows, columns[explore.x], columns[explore.y]);
  return html`<section class="panel">${controls}${chart}</section>`;
}
