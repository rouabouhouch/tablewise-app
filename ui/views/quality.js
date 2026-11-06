import { html, formatNumber as fmt, formatPercent as percent } from '../html.js?v=1919cefb67302b76';
import { statCard, panelTitle, callout } from '../components/common.js?v=1919cefb67302b76';

function columnCheck(column, rowCount) {
  const numeric = column.type === 'number';
  let note = 'No basic flags';
  if (column.unique <= 1) note = 'Constant or empty';
  else if (column.idLike) note = 'Possible identifier';
  else if (column.outliers) note = 'Review unusual values';
  return html`<tr>
    <td>${column.name}</td><td><span class="type">${column.type}</span></td>
    <td>${fmt(column.unique, 0)}</td><td>${column.missing} (${percent(column.missing / rowCount)})</td>
    <td>${numeric ? column.invalid : 'N/A'}</td><td>${numeric ? column.outliers : 'N/A'}</td><td>${note}</td>
  </tr>`;
}

function checkRow(title, description, count) {
  return html`<div class="check-row">${count != null && html`<div class="check-number">${fmt(count, 0)}</div>`}
    <div><h3>${title}</h3><p>${description}</p></div></div>`;
}

export function qualityView({ summary }) {
  const { columns, missing, duplicates, cells, rows } = summary;
  const outliers = columns.reduce((sum, column) => sum + (column.outliers ?? 0), 0);
  const invalid = columns.reduce((sum, column) => sum + column.invalid, 0);
  const constant = columns.filter(column => column.unique <= 1).length;
  return html`<div class="stats">
    ${statCard('MISSING CELLS', fmt(missing, 0), percent(missing / cells) + ' of all cells', 'quality')}
    ${statCard('DUPLICATE ROWS', duplicates, 'Exact full-row duplicates', 'data')}
    ${statCard('OUTLIER CELLS', outliers, 'Flagged by the 1.5 × IQR rule', 'explore')}
    ${statCard('CONSTANT COLUMNS', constant, 'One or no distinct values', 'overview')}
  </div>
  ${callout('Flags are a starting point for review. The table and CSV export retain the original records.')}
  <section class="panel">${panelTitle('Column-by-column check', 'Missing values and numeric validity are checked across the whole file.')}
    <div class="table-container"><table>
      <thead><tr><th>Column</th><th>Detected type</th><th>Distinct</th><th>Missing</th><th>Non-numeric</th><th>Outliers</th><th>Note</th></tr></thead>
      <tbody>${columns.map(column => columnCheck(column, rows))}</tbody>
    </table></div></section>
  <div class="grid-equal spacer">
    <section class="panel"><h3>What the checks mean</h3>
      ${checkRow('Missing cells', 'Blank cells and NA, N/A, null or NaN markers are treated as missing.', missing)}
      ${checkRow('Duplicate rows', 'Rows with exactly the same values in every column. Repeated measurements may be legitimate.', duplicates)}
      ${checkRow('Numeric outliers', 'Values below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR. An unusual value can be a valid observation.', outliers)}
    </section>
    <section class="panel"><h3>Before you build a model</h3>
      ${checkRow('Choose inputs available at prediction time', 'Exclude outcome-derived columns, identifiers and future information.')}
      ${checkRow('Check the shape of your records', 'A random split assumes independent rows. Use a time split for observations ordered by date.')}
      ${checkRow('Confirm formats', (invalid ? `${invalid} non-numeric values in numeric columns will be omitted from statistics and imputed for model inputs. ` : '') +
        'Numeric inference requires at least 95% parseable non-missing values. Dates use ISO format. Other formats are kept as categories.')}
    </section></div>`;
}
