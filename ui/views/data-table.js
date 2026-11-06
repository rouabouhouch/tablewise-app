import { parseNumber } from '../../data/values.js';
import { html, formatNumber } from '../html.js';
import { columnChoices, emptyState, rowTable, selectField } from '../components/common.js';

const PAGE_SIZE = 25;

function comparator(column, direction) {
  const { type, index } = column;
  if (type !== 'number') return (a, b) => a[index].localeCompare(b[index]) * direction;
  return (a, b) => {
    const left = parseNumber(a[index]);
    const right = parseNumber(b[index]);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (left - right) * direction;
  };
}

export function tableView({ dataset, summary, table }) {
  const { columns } = summary;
  const query = table.search.toLowerCase();
  const matching = dataset.rows.filter(row => !query || row.some(value => value.toLowerCase().includes(query)));
  if (table.sortColumn >= 0) matching.sort(comparator(columns[table.sortColumn], table.direction));
  const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.max(0, Math.min(table.page, pages - 1));
  const offset = page * PAGE_SIZE;
  const order = [{ value: -1, label: 'Original order' }, ...columnChoices(columns)];
  const directions = [{ value: 1, label: 'Ascending' }, { value: -1, label: 'Descending' }];

  return html`<section class="panel">
    <div class="controls">
      <label class="field"><span>Find a value</span><input class="search" id="row-search" type="search"
        placeholder="Search all columns…" value="${table.search}"></label>
      ${selectField('sort-col', 'Sort by', order, table.sortColumn)}
      ${selectField('sort-dir', 'Direction', directions, table.direction)}
      <button class="button secondary" id="download-csv">Download CSV ↗</button>
    </div>
    ${matching.length ? rowTable(columns, matching.slice(offset, offset + PAGE_SIZE), offset) : emptyState('No rows match your search.')}
    <div class="table-footer"><span>${formatNumber(matching.length, 0)} matching rows · ${columns.length} columns · Original data retained</span>
      <div class="pagination">
        <button class="button secondary small" id="prev-page" ${page === 0 && 'disabled'}>Previous</button>
        <span>${page + 1} / ${pages}</span>
        <button class="button secondary small" id="next-page" ${page === pages - 1 && 'disabled'}>Next</button>
      </div>
    </div></section>`;
}
