import { comparisonTable, selectedCandidate } from '../components/comparison.js?v=1919cefb67302b76';
import { html, formatNumber as fmt, formatPercent as percent } from '../html.js?v=1919cefb67302b76';
import { barRows, callout, panelTitle } from '../components/common.js?v=1919cefb67302b76';
import { scatterChart } from '../components/charts.js?v=1919cefb67302b76';

function metricCards(result) {
  const { metrics, baseline, model } = result;
  const cards = model.task === 'regression' ? [
    [fmt(metrics.mae, 3), 'Mean absolute error', `Baseline ${fmt(baseline.mae, 3)} · lower is better`],
    [fmt(metrics.rmse, 3), 'Root mean squared error', `Baseline ${fmt(baseline.rmse, 3)} · lower is better`],
    [fmt(metrics.r2, 3), 'R² score', 'Can be negative; higher is better'],
  ] : [
    [percent(metrics.accuracy), 'Accuracy', `Baseline ${percent(baseline.accuracy)}`],
    [fmt(metrics.macroF1, 3), 'Macro F1', `Baseline ${fmt(baseline.macroF1, 3)} · higher is better`],
    [model.classes.length, 'Target categories', 'Every category weighted equally in macro F1'],
  ];
  return html`<div class="model-stats">${cards.map(([value, label, detail]) =>
    html`<div class="model-stat"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`
  )}</div>`;
}

function confusionMatrix(classes, matrix) {
  return html`<div class="table-container spacer"><table>
    <thead><tr><th>Actual ↓ / Predicted →</th>${classes.map(label => html`<th>${label}</th>`)}</tr></thead>
    <tbody>${matrix.map((row, index) => html`<tr><th>${classes[index]}</th>
      ${row.map((value, col) => html`<td class="${index === col ? 'correct-cell' : ''}">${value}</td>`)}
    </tr>`)}</tbody></table></div>`;
}

function methodology(result) {
  const meanBaseline = result.model.task === 'regression';
  const baseline = meanBaseline ? 'the training-set mean' : 'the most common training category';
  const sampleDetail = result.sampled
    ? `Only ${result.trainCount + result.testCount} of ${result.available} eligible rows were used (${result.split === 'time' ? 'most recent' : 'seeded random sample'}).` : '';
  return html`<details class="methodology"><summary>How this evaluation works</summary>
    <p>Preprocessing is fitted on training rows only. Numeric inputs use training medians for missing values and training scaling.
      Categories use up to 14 training levels plus an unknown/missing bucket. The baseline predicts ${baseline}.
      The model is evaluated on held-out records. ${result.excluded} rows without a usable outcome and ${result.duplicates} repeated input/outcome records were excluded. ${sampleDetail}</p>
    <p>${result.comparison
      ? 'Candidate settings share the same folds. Each fold learns input types, imputation, scaling and category levels from its own training rows. Trees vary maximum depth. The penalty controls how strongly the linear model shrinks its coefficients. The selected setting is refitted before the final test.'
      : 'The fixed fit uses a ridge penalty of 1 or logistic L2 penalty of 0.005.'}
      Repeated entities, future information and distribution shifts can distort a score.</p>
  </details>`;
}

function inputField(spec) {
  const name = 'p-' + spec.index;
  return html`<label class="field"><span>${spec.name}</span>
    ${spec.type === 'number'
      ? html`<input type="number" step="any" name="${name}" value="${spec.median}">`
      : html`<select name="${name}"><option value="">Missing / other</option>
        ${spec.levels.map(level => html`<option value="${level}">${level}</option>`)}</select>`}
  </label>`;
}

export function predictionOutput(model, value) {
  return html`<div class="prediction-output"><span>Predicted ${model.target}</span>
    <strong>${model.task === 'regression' ? fmt(value, 2) : value}</strong></div>
    <p class="chart-note">Exploratory estimate. Results may be unreliable outside the training data range.</p>`;
}

function modelDiagnostics(model, effects) {
  if (model.algorithm === 'baseline') {
    return html`<div><h3>Constant prediction</h3><p class="chart-note">Every new row receives the same training-set estimate.</p>
      <strong>${model.task === 'regression' ? fmt(model.constant, 3) : model.constant}</strong></div>`;
  }
  if (model.algorithm === 'tree') {
    return html`<div><h3>Fitted decision tree</h3><p class="chart-note">Depth limit ${model.parameters.maxDepth},
      minimum ${model.parameters.minLeaf} training rows per leaf. The fitted tree reached depth ${model.depthUsed}
      and has ${model.leaves} terminal predictions.</p></div>`;
  }
  return html`<div><h3>Model coefficient magnitude</h3>
    <p class="chart-note">Magnitude depends on the model and its encoding. For categories, magnitudes sum the encoded coefficients.</p>
    ${barRows(effects.map(effect => [effect.name, effect.strength]), effects[0]?.strength, value => fmt(value, 2))}</div>`;
}

export function modelResults(result) {
  const { model, metrics, baseline, effects } = result;
  const regression = model.task === 'regression';
  const better = regression ? metrics.mae < baseline.mae : metrics.macroF1 > baseline.macroF1;
  const plot = regression ? scatterChart(result.points, 'Observed', 'Predicted', true)
    : confusionMatrix(model.classes, metrics.matrix);
  const selected = selectedCandidate(result.comparison);
  const name = selected?.name ?? (regression ? 'Ridge regression' : 'Logistic classification');
  const badge = model.algorithm === 'baseline' ? 'BASELINE SELECTED' : better ? 'BEATS BASELINE' : 'BASELINE IS AS GOOD OR BETTER';
  return html`${result.comparison && html`<section class="panel spacer">${comparisonTable(result.comparison)}</section>`}
  <section class="panel spacer"><div class="panel-title">
    <div><h3>Final test · ${model.target}</h3>
      <p>${name}${selected && ' · ' + selected.setting}</p>
      <p>${fmt(result.trainCount, 0)} training rows · ${fmt(result.testCount, 0)} held-out rows ·
        ${result.split === 'time' ? 'chronological' : 'seeded random'} split</p></div>
    <span class="pill ${better ? '' : 'orange'}">${badge}</span>
  </div>${metricCards(result)}
  ${callout(model.algorithm === 'baseline' ? 'The baseline ranked first on validation and is used for new predictions.'
    : better ? 'The selected model also beat the baseline on the final test rows.'
    : 'The baseline performed as well as or better on the final test. The validation choice is shown as originally selected.',
      better || model.algorithm === 'baseline' ? '' : 'warning')}
  <div class="grid-two"><div><h3>${regression ? 'Predicted vs. observed' : 'Confusion matrix'}</h3>${plot}
    <p class="chart-note">${regression ? 'Up to 300 held-out rows. The dashed line marks a perfect prediction.'
      : 'Each cell counts held-out examples. Correct predictions lie on the diagonal.'}</p></div>
    ${modelDiagnostics(model, effects)}
    </div>${methodology(result)}</section>
  <section class="panel spacer">
    ${panelTitle('Make a prediction', model.algorithm === 'baseline' ? 'The selected baseline gives the same estimate for any row.'
      : 'Enter the inputs for one new observation. Empty numeric inputs use the training median.')}
    <form id="prediction-form"><div class="prediction-form">${model.specs.map(inputField)}</div>
      <button class="button primary spacer" type="submit">Predict ${model.target}</button></form>
    <div id="prediction-output" aria-live="polite"></div>
  </section>`;
}
