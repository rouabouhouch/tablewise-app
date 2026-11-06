import { csvText } from '../data/csv.js?v=6ee401bc68a87739';
import { demoData } from '../data/sample.js?v=6ee401bc68a87739';
import { predict } from '../ml/inference.js?v=6ee401bc68a87739';
import { analysisReport } from '../ui/report.js?v=6ee401bc68a87739';
import { createShell } from '../ui/shell.js?v=6ee401bc68a87739';
import { predictionOutput } from '../ui/views/model-results.js?v=6ee401bc68a87739';
import { readDataset, download } from './files.js?v=6ee401bc68a87739';
import { TrainingClient } from './training-client.js?v=6ee401bc68a87739';
import { createWorkspace, defaultFeatures } from './workspace.js?v=6ee401bc68a87739';

/** Mount one workspace. Listeners live on the shell so re-rendering adds none. */
export function mountTablewise(root) {
  const shell = createShell(root);
  const trainer = new TrainingClient();
  const listeners = new AbortController();
  const get = id => root.getElementById(id);
  const listen = (type, handler) => root.addEventListener(type, handler, { signal: listeners.signal });
  let workspace = createWorkspace(demoData());
  let importRevision = 0;
  const render = () => shell.render(workspace, trainer.running);

  function replaceDataset(dataset) {
    const next = createWorkspace(dataset);
    trainer.cancel();
    workspace = next;
    shell.notice(dataset.warnings.join(' '));
    render();
  }

  async function openFile(file) {
    if (!file) return;
    const revision = ++importRevision;
    shell.notice('Reading your file locally…');
    try {
      const dataset = await readDataset(file);
      if (revision === importRevision) replaceDataset(dataset);
    } catch (error) {
      if (revision === importRevision) shell.notice(error.message, true);
    }
  }

  function sampleAction() {
    if (workspace.dataset.demo) {
      const { headers, rows, name } = workspace.dataset;
      download(csvText(headers, rows), name, 'text/csv');
    } else {
      importRevision++;
      replaceDataset(demoData());
    }
  }

  function editExperiment(changes) {
    Object.assign(workspace.experiment, changes);
    workspace.result = null;
    shell.notice();
    render();
  }

  function toggleTraining() {
    if (trainer.running) {
      trainer.cancel();
      shell.notice('Training cancelled.');
    } else {
      workspace.result = null;
      shell.notice();
      trainer.start(workspace.dataset, workspace.experiment, message => {
        if (message.error) shell.notice(message.error, true);
        else workspace.result = message.result;
        render();
      });
    }
    render();
  }

  function navigate(screen) {
    if (!shell.hasScreen(screen)) return;
    workspace.screen = screen;
    shell.notice();
    render();
    root.defaultView.scrollTo({ top: 0, behavior: 'instant' });
  }

  function updateTable(changes) {
    Object.assign(workspace.table, changes);
    render();
  }
  function updateExplore(changes) {
    Object.assign(workspace.explore, changes);
    render();
  }

  const clicks = {
    'upload-button': () => get('file-input').click(),
    'sample-button': sampleAction,
    'export-button': () => download(analysisReport(workspace), 'tablewise-report.html', 'text/html'),
    'help-button': () => get('help-dialog').showModal(),
    'how-button': () => get('help-dialog').showModal(),
    'train-button': toggleTraining,
    'prev-page': () => updateTable({ page: workspace.table.page - 1 }),
    'next-page': () => updateTable({ page: workspace.table.page + 1 }),
    'download-csv': () => {
      const { headers, rows, name } = workspace.dataset;
      download(csvText(headers, rows), 'tablewise-' + name.replace(/\.tsv$/i, '.csv'), 'text/csv');
    },
  };
  listen('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.go) return navigate(button.dataset.go);
    if (button.classList.contains('close-dialog')) return get('help-dialog').close();
    if (Object.hasOwn(clicks, button.id)) clicks[button.id]();
  });

  const changes = {
    'explore-col': value => updateExplore({ column: Number(value) }),
    'chart-mode': value => updateExplore({ mode: value }),
    'scatter-x': value => updateExplore({ x: Number(value) }),
    'scatter-y': value => updateExplore({ y: Number(value) }),
    'model-task': task => editExperiment({ task }),
    'target-col': value => {
      const target = Number(value);
      editExperiment({ target, features: defaultFeatures(workspace.summary.columns, target) });
    },
    'model-split': split => editExperiment({ split }),
    'split-date': value => editExperiment({ date: Number(value) }),
    'sort-col': value => updateTable({ sortColumn: Number(value), page: 0 }),
    'sort-dir': value => updateTable({ direction: Number(value) }),
  };
  listen('change', ({ target }) => {
    if (target.id === 'file-input') {
      const file = target.files[0];
      target.value = '';
      openFile(file);
    } else if (target.name === 'feature') {
      const selected = root.querySelectorAll('input[name="feature"]:checked');
      editExperiment({ features: Array.from(selected, input => Number(input.value)) });
      root.querySelector(`input[name="feature"][value="${Number(target.value)}"]`)?.focus();
    } else if (Object.hasOwn(changes, target.id)) {
      changes[target.id](target.value);
      get(target.id)?.focus();
    }
  });

  listen('input', ({ target }) => {
    if (target.id !== 'row-search') return;
    const { selectionStart, selectionEnd } = target;
    updateTable({ search: target.value, page: 0 });
    get('row-search').focus();
    get('row-search').setSelectionRange(selectionStart, selectionEnd);
  });
  listen('submit', event => {
    if (event.target.id !== 'prediction-form') return;
    event.preventDefault();
    if (!workspace.result) return;
    const { model } = workspace.result;
    const values = new FormData(event.target);
    const row = Array(workspace.dataset.headers.length).fill('');
    for (const spec of model.specs) row[spec.index] = String(values.get('p-' + spec.index) ?? '');
    get('prediction-output').innerHTML = predictionOutput(model, predict(model, row));
  });
  listen('dragover', event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    root.body.classList.add('drop-overlay');
  });
  listen('dragleave', event => {
    if (!event.relatedTarget) root.body.classList.remove('drop-overlay');
  });
  listen('drop', event => {
    event.preventDefault();
    root.body.classList.remove('drop-overlay');
    openFile(event.dataTransfer.files[0]);
  });

  render();
  return function unmount() {
    importRevision++;
    trainer.cancel();
    listeners.abort();
  };
}
