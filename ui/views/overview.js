import { html, formatNumber as fmt, formatPercent as percent } from '../html.js';
import { statCard, panelTitle, icon, barRows, rowTable } from '../components/common.js';
import { histogramChart, categoryChart } from '../components/charts.js';

function insight(label, title, detail, destination, action) {
  return html`<article class="insight"><div class="insight-kicker">${label}</div><h3>${title}</h3>
    <p>${detail}</p><button class="text-button" data-go="${destination}">${action} ↗</button></article>`;
}

export function overviewView({ dataset, summary, explore, strongest }) {
  const numeric = summary.columns.filter(column => column.type === 'number');
  const column = numeric.find(item => item.index === explore.column) ?? numeric.at(-1) ?? summary.columns[0];
  const isNumeric = column.type === 'number';
  const completeness = summary.columns.slice(0, 7).map(item => [item.name, 1 - item.missing / summary.rows]);
  const flagged = summary.columns.filter(item => item.outliers > 0);
  const outliers = flagged.reduce((count, item) => count + item.outliers, 0);
  const correlationTitle = strongest
    ? (Math.abs(strongest.r) < 0.3 ? 'Little linear association' : 'Two columns move together')
    : 'Room to explore';
  const correlationText = strongest
    ? `${strongest.a.name} and ${strongest.b.name} have a correlation of ${fmt(strongest.r, 2)} across ${fmt(strongest.n, 0)} paired rows.`
    : 'Add two non-constant numeric columns to explore their relationship.';

  return html`<div class="stats">
    ${statCard('TOTAL ROWS', fmt(summary.rows, 0), 'Ready to explore', 'data')}
    ${statCard('COLUMNS', summary.columns.length, `${numeric.length} numeric · ${summary.columns.length - numeric.length} other`, 'overview')}
    ${statCard('COMPLETE CELLS', percent(1 - summary.missing / summary.cells), `${fmt(summary.missing, 0)} missing cells`, 'quality')}
    ${statCard('DUPLICATE ROWS', summary.duplicates, 'Exact row matches', 'data')}
  </div>
  <div class="section-heading"><h3>The big picture</h3><small>A first look at what’s inside</small></div>
  <div class="grid-two">
    <section class="panel">
      ${panelTitle(column.name, isNumeric ? 'How values are distributed' : 'Most frequent values', isNumeric ? 'DISTRIBUTION' : 'FREQUENCY')}
      ${isNumeric ? histogramChart(dataset.rows, column) : categoryChart(column)}
      <div class="chart-note">${isNumeric
        ? `Median ${fmt(column.median)} · Average ${fmt(column.mean)} · ${fmt(summary.rows - column.missing - column.invalid, 0)} numeric values`
        : 'Counts across non-missing rows.'}</div>
    </section>
    <section class="panel">${panelTitle('How complete is your data?', 'Non-missing cells, by column', 'QUALITY')}
      ${barRows(completeness, 1, percent)}
      <div class="quality-summary">${icon('quality')}<span>
        ${summary.missing ? `${fmt(summary.missing, 0)} missing cells.` : 'Every cell has a value.'}
        ${summary.columns.length > 7 && ' First 7 columns shown.'}</span></div>
    </section>
  </div>
  <div class="section-heading"><h3>A few things worth noticing</h3><small>Calculated from this dataset</small></div>
  <div class="insight-grid">
    ${insight('A CONNECTION', correlationTitle, correlationText, 'explore', 'Explore relationships')}
    ${insight('A CLOSER LOOK', outliers ? `${fmt(outliers, 0)} unusual numeric cells` : 'No numeric outliers flagged',
      outliers ? `Across ${flagged.length} columns, some values fall outside the usual range. They could be valid observations or data issues.`
        : 'The IQR rule did not flag unusual numeric values.', 'quality', 'Review data quality')}
    ${insight('A NEXT STEP', 'Put a prediction to the test',
      'Pick an outcome, select its inputs, and compare a trained model with a simple baseline.', 'predict', 'Try a model')}
  </div>
  <div class="section-heading"><h3>A peek at the rows</h3>
    <button class="text-button inline-action" data-go="data">View all ${fmt(summary.rows, 0)} rows ↗</button></div>
  ${rowTable(summary.columns, dataset.rows.slice(0, 5))}`;
}
