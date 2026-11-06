import { html, formatNumber as fmt } from '../html.js?v=1919cefb67302b76';

export function selectedCandidate(comparison) {
  return comparison?.leaderboard.find(candidate => candidate.id === comparison.selectedId);
}

export function comparisonTable(comparison) {
  const lower = comparison.metric === 'mae';
  const scoreLabel = lower ? 'Validation MAE' : 'Validation macro F1';
  const direction = lower ? 'Lower is better.' : 'Higher is better. Each category has equal weight.';
  return html`<h3>Model comparison</h3>
    <p class="chart-note">${direction} Each setting was compared on the same validation rows.
      Close scores can change with another sample.</p>
    <div class="table-container spacer"><table>
      <thead><tr><th scope="col">Model</th><th scope="col">Settings</th><th scope="col">${scoreLabel}</th>
        <th scope="col">Scores by fold</th><th scope="col">Selection</th></tr></thead>
      <tbody>${comparison.leaderboard.map(candidate => html`<tr>
        <td>${candidate.name}</td><td>${candidate.setting}</td>
        <td>${fmt(candidate.score, 3)}</td><td>${candidate.foldScores.map(score => fmt(score, 3)).join(' / ')}</td>
        <td>${candidate.id === comparison.selectedId ? html`<strong>Selected</strong>`
          : candidate.error || candidate.refitError || ''}</td>
      </tr>`)}</tbody>
    </table></div>
    <p class="chart-note">${comparison.folds.length} ${comparison.scheme} · ${fmt(comparison.validatedRows, 0)} validation predictions.
      The ranking uses pooled validation predictions. Exact ties favor the baseline and then the first simpler setting in the search order.</p>
    ${comparison.sampled && html`<p class="chart-note">For this browser run, comparison used ${fmt(comparison.poolSize, 0)} training rows.
      The selected setting was then fitted on the full training partition.</p>`}`;
}
