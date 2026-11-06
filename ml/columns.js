import { LIMITS } from '../limits.js?v=1919cefb67302b76';

export function targetColumns(columns) {
  return columns.filter(column =>
    column.unique > 1 &&
    (column.type === 'number' || (column.type === 'category' && column.unique <= 8))
  );
}

export function inputColumns(columns, targetIndex) {
  return columns.filter(column => {
    if (column.index === targetIndex || column.idLike || column.unique <= 1) return false;
    return column.type === 'number' || (column.type === 'category' && column.unique <= 50);
  });
}

export function trainingRequest(columns, options, { foldLocalInputs = false } = {}) {
  const target = columns[options.target];
  if (!target) throw new Error('Choose a target column.');

  let task = options.task ?? 'auto';
  if (task === 'auto') task = target.type === 'number' && target.unique > 8 ? 'regression' : 'classification';
  if (!['regression', 'classification'].includes(task)) throw new Error('Choose a supported prediction type.');
  if (task === 'regression' && target.type !== 'number') throw new Error('A numeric prediction needs a numeric target.');

  const selected = new Set(options.features);
  const features = columns.filter(column => selected.has(column.index) && column !== target &&
    (foldLocalInputs || column.type === 'number' || column.type === 'category'));
  if (!features.length) throw new Error('Select at least one usable input column.');
  if (features.length > LIMITS.features) throw new Error('Choose 12 input columns or fewer.');
  if (!foldLocalInputs && features.some(column => column.type === 'category' && column.unique > 50)) {
    throw new Error('Remove text or identifier columns with more than 50 distinct values.');
  }
  const split = options.split ?? 'random';
  if (!['random', 'time'].includes(split)) throw new Error('Choose a supported evaluation split.');
  return { task, target, features, split, date: options.date };
}
