import { inputColumns, targetColumns } from '../../ml/columns.js?v=6ee401bc68a87739';
import { html } from '../html.js?v=6ee401bc68a87739';
import { callout, columnChoices, emptyState, panelTitle, selectField } from '../components/common.js?v=6ee401bc68a87739';
import { modelResults } from './model-results.js?v=6ee401bc68a87739';

const taskChoices = [
  { value: 'auto', label: 'Auto-detect' }, { value: 'regression', label: 'Number (regression)' },
  { value: 'classification', label: 'Category (classification)' },
];

export function predictView({ summary: { columns }, experiment, result }, training) {
  const targets = targetColumns(columns);
  if (!targets.length) {
    return html`<div class="panel">${emptyState('Choose a dataset with a numeric outcome or a category with 2 to 8 values.')}</div>`;
  }
  const dates = columns.filter(column => column.type === 'date');
  const eligible = inputColumns(columns, experiment.target);
  const splits = [
    { value: 'random', label: 'Random 80% / 20%' },
    { value: 'time', label: 'Earlier / later dates', disabled: !dates.length },
  ];
  return html`${callout('Models train on this file. Numeric outcomes use ridge regression. Categories use logistic classification.')}
  <section class="panel">
    ${panelTitle('What would you like to predict?', 'Choose an outcome and the inputs you would know before it occurs.')}
    <div class="controls">
      ${selectField('target-col', 'Outcome column', columnChoices(targets), experiment.target, training)}
      ${selectField('model-task', 'Prediction type', taskChoices, experiment.task, training)}
      ${selectField('model-split', 'Evaluation split', splits, experiment.split, training)}
      ${experiment.split === 'time' && selectField('split-date', 'Date column', columnChoices(dates), experiment.date, training)}
    </div>
    <div class="small-label">Input columns <span class="muted">· choose up to 12</span></div>
    <div class="feature-options">${eligible.length ? eligible.map(column => html`<label class="feature-option">
      <input type="checkbox" name="feature" value="${column.index}"
        ${experiment.features.includes(column.index) && 'checked'} ${training && 'disabled'}>${column.name}</label>`)
      : html`<p class="muted">No eligible input columns.</p>`}</div>
    <p class="chart-note">Dates, possible identifiers, constant columns and high-cardinality text are excluded.</p>
    <div class="model-bottom"><p>At least 60 distinct labelled rows. Training and evaluation use up to 5,000 rows in a reproducible split.</p>
      <button class="button primary" id="train-button" ${!eligible.length && 'disabled'}>
        ${training ? 'Cancel training' : 'Train & evaluate ↗'}</button></div>
    ${training && html`<div class="progress"></div><p class="chart-note" role="status">Fitting the model and checking held-out rows…</p>`}
  </section><div id="model-result">${result && modelResults(result)}</div>`;
}
