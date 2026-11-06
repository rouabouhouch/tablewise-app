import { html } from './html.js?v=1919cefb67302b76';
import { icon, callout } from './components/common.js?v=1919cefb67302b76';
import { overviewView } from './views/overview.js?v=1919cefb67302b76';
import { exploreView } from './views/explore.js?v=1919cefb67302b76';
import { qualityView } from './views/quality.js?v=1919cefb67302b76';
import { predictView } from './views/predict.js?v=1919cefb67302b76';
import { tableView } from './views/data-table.js?v=1919cefb67302b76';

const screens = {
  overview: { label: 'Overview', title: 'Meet your data.', subtitle: 'A clearer picture, from the very first row.', view: overviewView },
  explore: { label: 'Explore', title: 'Follow the patterns.', subtitle: 'Choose a column, ask a question, see what emerges.', view: exploreView },
  quality: { label: 'Data quality', title: 'A little quality time.', subtitle: 'Understand the gaps before you trust the answers.', view: qualityView },
  predict: { label: 'Predict', title: 'What could come next?', subtitle: 'Build an exploratory model. See how well it actually performs.', view: predictView },
  data: { label: 'Data table', title: 'Every row, in view.', subtitle: 'Look closer at the numbers behind the story.', view: tableView },
};

function datasetBar(dataset) {
  return html`<span class="file-icon">CSV</span>
    <span class="dataset-name" title="${dataset.name}">${dataset.name}</span>
    <span class="pill">${dataset.demo ? 'SYNTHETIC SAMPLE' : 'YOUR DATA'}</span>
    <span class="dataset-note">${dataset.demo ? 'A sample to get you started' : 'Only in this browser session'}</span>
    <button class="text-button" id="sample-button">${dataset.demo ? 'Download sample' : 'Reset to sample'} ↗</button>`;
}

export function createShell(root) {
  const get = id => root.getElementById(id);
  return {
    render(workspace, training) {
      const active = workspace.screen;
      const screen = screens[active];
      get('navigation').innerHTML = html`${Object.entries(screens).map(([id, definition]) => html`
        <button class="nav-item ${id === active ? 'active' : ''}" data-go="${id}"
          aria-current="${id === active ? 'page' : 'false'}">${icon(id)}${definition.label}
          ${id === 'predict' && html`<span class="nav-tag">ML</span>`}</button>`)}`;
      get('breadcrumb').textContent = screen.label;
      get('page-title').textContent = screen.title;
      get('page-subtitle').textContent = screen.subtitle;
      get('dataset-bar').innerHTML = datasetBar(workspace.dataset);
      get('content').innerHTML = screen.view(workspace, training);
    },
    notice(message = '', isError = false) {
      get('status').innerHTML = message ? callout(message, isError ? 'error' : '') : '';
    },
    hasScreen(id) { return Object.hasOwn(screens, id); },
  };
}
