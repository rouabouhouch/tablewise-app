import { profile } from '../data/profile.js?v=6ee401bc68a87739';
import { strongestCorrelation } from '../data/statistics.js?v=6ee401bc68a87739';
import { inputColumns, targetColumns } from '../ml/columns.js?v=6ee401bc68a87739';

export function defaultFeatures(columns, target) {
  return inputColumns(columns, target).slice(0, 8).map(column => column.index);
}

/** All per-file state is created together when opening a file or resetting the sample. */
export function createWorkspace(dataset) {
  const summary = profile(dataset);
  const columns = summary.columns;
  const numeric = columns.filter(column => column.type === 'number');
  const targets = targetColumns(columns);
  const target = targets.filter(column => column.type === 'number').at(-1)?.index ?? targets[0]?.index ?? 0;
  return {
    dataset, summary, screen: 'overview', result: null,
    strongest: strongestCorrelation(dataset.rows, columns),
    explore: {
      mode: 'distribution', column: numeric.at(-1)?.index ?? 0,
      x: numeric[0]?.index ?? 0, y: (dataset.demo ? numeric.at(-1) : numeric[1])?.index ?? 0,
    },
    table: { page: 0, search: '', sortColumn: -1, direction: 1 },
    experiment: {
      target, features: defaultFeatures(columns, target), task: 'auto', split: 'random',
      date: columns.find(column => column.type === 'date')?.index,
    },
  };
}
