import { inputColumns, targetColumns } from '../../ml/columns.js?v=1919cefb67302b76';
import { html } from '../html.js?v=1919cefb67302b76';
import { callout, columnChoices, emptyState, panelTitle, selectField } from '../components/common.js?v=1919cefb67302b76';
import { modelResults } from './model-results.js?v=1919cefb67302b76';

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
  return html`${callout('Tablewise compares a baseline, a linear model and a decision tree on your data. It tests three penalty strengths and three tree depths, then checks the selected setting on separate test rows.')}
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
    <div class="model-bottom"><p>At least 60 distinct labelled rows. Up to 5,000 labelled rows per experiment. Model selection uses up to 1,200 training rows. Dates use forward validation.</p>
      <button class="button primary" id="train-button" ${!eligible.length && 'disabled'}>
        ${training ? 'Cancel training' : 'Compare & train ↗'}</button></div>
    ${training && html`<div class="progress"></div><p class="chart-note" role="status">Comparing settings on training folds, then checking the selected model on held-out rows…</p>`}
  </section><div id="model-result">${result && modelResults(result)}</div>`;
}
