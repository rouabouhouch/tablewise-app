import { html, formatNumber } from '../html.js?v=6ee401bc68a87739';
import { isMissing } from '../../data/values.js?v=6ee401bc68a87739';

const icons = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  explore: 'M4 20V10m7 10V4m7 16v-8M2 21h20',
  quality: 'm12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6zM8 11l3 3 5-5',
  predict: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',
  data: 'M3 4h18v16H3zM3 9h18M3 14h18M9 4v16M15 4v16',
};

export function icon(name) {
  return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="${icons[name]}"></path></svg>`;
}

export function statCard(label, value, caption, iconName) {
  return html`<div class="stat">
    <div class="stat-label">${label}${icon(iconName)}</div>
    <div class="stat-value tabular">${value}</div><div class="stat-caption">${caption}</div>
  </div>`;
}

export function panelTitle(title, description, tag) {
  return html`<div class="panel-title">
    <div><h3>${title}</h3>${description && html`<p>${description}</p>`}</div>
    ${tag && html`<span class="subtle-tag">${tag}</span>`}
  </div>`;
}

export function emptyState(message) {
  return html`<div class="empty">${message}</div>`;
}

export function callout(message, kind = '') {
  return html`<div class="callout ${kind}">${message}</div>`;
}

export function columnChoices(columns) {
  return columns.map(column => ({ value: column.index, label: column.name }));
}

export function selectField(id, label, choices, selected, disabled = false) {
  return html`<label class="field"><span>${label}</span>
    <select id="${id}" ${disabled && 'disabled'}>
      ${choices.map(choice => html`<option value="${choice.value}"
        ${String(choice.value) === String(selected) && 'selected'} ${choice.disabled && 'disabled'}>
        ${choice.label}</option>`)}
    </select></label>`;
}

export function barRows(entries, max, format = value => formatNumber(value, 0)) {
  return entries.map(([label, value]) => {
    const width = Math.max(0, Math.min(100, 100 * value / (max || 1)));
    return html`<div class="bar-row"><span title="${label}">${label}</span>
      <div class="bar-track"><i style="width:${width}%"></i></div><strong>${format(value)}</strong>
    </div>`;
  });
}

function cellValue(value) {
  if (isMissing(value)) return html`<span class="null">empty</span>`;
  return value.length > 100 ? value.slice(0, 100) + '…' : value;
}

export function rowTable(columns, rows, offset = 0) {
  const typeLabels = { number: '123', date: 'DATE', category: 'ABC', empty: 'ABC' };
  return html`<div class="table-container"><table>
    <thead><tr><th scope="col">#</th>${columns.map(column =>
      html`<th scope="col">${column.name} <span class="type">${typeLabels[column.type]}</span></th>`
    )}</tr></thead>
    <tbody>${rows.map((row, index) => html`<tr><td class="row-index">${offset + index + 1}</td>
      ${row.map(value => html`<td>${cellValue(value)}</td>`)}</tr>`)}</tbody>
  </table></div>`;
}
