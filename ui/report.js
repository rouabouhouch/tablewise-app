import { html, formatNumber } from './html.js';

const reportStyles = `
  body { font: 15px/1.7 system-ui; max-width: 1000px; margin: 50px auto; padding: 0 24px; color: #233a33; }
  h1 { font: 42px Georgia; } table { border-collapse: collapse; width: 100%; font-size: 12px; }
  td, th { padding: 10px; border: 1px solid #ddd; text-align: left; } th { background: #eef3e6; }
  pre { white-space: pre-wrap; background: #f3f5ef; padding: 20px; } small { color: #777; }
`;

function modelSection(result) {
  const details = {
    metrics: result.metrics, baseline: result.baseline, excludedRows: result.excluded,
    duplicateRecordsRemoved: result.duplicates, sampled: result.sampled, inputs: result.model.specs.map(spec => spec.name),
  };
  return html`<h2>Model evaluation</h2>
    <p>Outcome: ${result.model.target}. ${result.model.task}. ${result.trainCount} training and
      ${result.testCount} held-out rows, ${result.split} split.</p>
    <pre>${JSON.stringify(details, null, 2)}</pre>
    <p>Preprocessing uses training data only. A single holdout measures performance on these records.
      Repeated entities and outcome-derived inputs require review.</p>`;
}

/** Produce a portable, script-free report containing column and model summaries. */
export function analysisReport({ dataset, summary, result }, generatedAt = new Date()) {
  return String(html`<!doctype html><html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
      <title>Tablewise report: ${dataset.name}</title><style>${reportStyles}</style></head>
    <body><small>TABLEWISE / LOCAL ANALYSIS REPORT</small><h1>${dataset.name}</h1>
      <p>Generated ${generatedAt.toISOString()}. ${dataset.demo && 'Synthetic demonstration data.'}</p>
      <p>${summary.rows} rows · ${summary.columns.length} columns · ${summary.missing} missing cells ·
        ${summary.duplicates} exact duplicate rows.</p>
      <h2>Column profile</h2><table><thead><tr>
        <th>Column</th><th>Type</th><th>Distinct</th><th>Missing</th><th>Non-numeric</th>
        <th>Mean</th><th>Median</th><th>Outliers</th></tr></thead>
      <tbody>${summary.columns.map(column => html`<tr>
        <td>${column.name}</td><td>${column.type}</td><td>${column.unique}</td><td>${column.missing}</td>
        <td>${column.invalid}</td><td>${formatNumber(column.mean, 3)}</td><td>${formatNumber(column.median, 3)}</td>
        <td>${column.outliers ?? 'N/A'}</td></tr>`)}</tbody></table>
      ${result && modelSection(result)}
      <h2>Method and limitations</h2><p>Numeric columns require at least 95% numeric non-missing values.
        Non-numeric cells are excluded from numeric summaries. Missing markers include blank, NA, N/A, null and NaN.
        Outliers use the 1.5 × IQR rule. Predictions require suitable independent observations and are exploratory.</p>
    </body></html>`);
}
