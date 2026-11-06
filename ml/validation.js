import { shuffled } from '../data/random.js?v=1919cefb67302b76';
import { parseDate } from '../data/values.js?v=1919cefb67302b76';

const MAX_SELECTION_ROWS = 1200;
const FOLDS = 3;

function labelGroups(rows, target) {
  const groups = new Map();
  for (const row of rows) {
    const label = row[target];
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  }
  return [...groups.values()];
}

function selectionPool(training, request) {
  if (training.length <= MAX_SELECTION_ROWS) return training;
  if (request.split === 'time') return training.slice(-MAX_SELECTION_ROWS);
  const random = shuffled(training, 731);
  if (request.task !== 'classification') return random.slice(0, MAX_SELECTION_ROWS);

  // Allocate a proportional quota while keeping enough representatives of rare classes.
  const groups = labelGroups(random, request.target.index);
  const quotas = groups.map(group => ({
    rows: group, ideal: group.length * MAX_SELECTION_ROWS / training.length,
    count: Math.min(FOLDS, group.length),
  }));
  let allocated = quotas.reduce((sum, group) => sum + group.count, 0);
  while (allocated < MAX_SELECTION_ROWS) {
    let next;
    for (const group of quotas) {
      if (group.count < group.rows.length && (!next || group.ideal - group.count > next.ideal - next.count)) next = group;
    }
    next.count++;
    allocated++;
  }
  return quotas.flatMap(group => group.rows.slice(0, group.count));
}

function randomFolds(pool, request) {
  const groups = request.task === 'classification' ? labelGroups(pool, request.target.index) : [pool];
  const buckets = Array.from({ length: FOLDS }, () => []);
  let position = 0;
  for (const [groupIndex, group] of groups.entries()) {
    for (const row of shuffled(group, 117 + groupIndex)) buckets[position++ % FOLDS].push(row);
  }
  return buckets.map((validation, index) => ({
    training: buckets.filter((_, bucket) => bucket !== index).flat(), validation,
  }));
}

function timeFolds(pool, dateColumn) {
  const groups = [];
  let previous;
  for (const row of pool) {
    const timestamp = parseDate(row[dateColumn]);
    if (timestamp !== previous) groups.push([]);
    groups.at(-1).push(row);
    previous = timestamp;
  }
  const blocks = Math.min(FOLDS + 1, groups.length);
  const folds = [];
  for (let block = 1; block < blocks; block++) {
    const cut = Math.floor(block * groups.length / blocks);
    const end = Math.floor((block + 1) * groups.length / blocks);
    const training = groups.slice(0, cut).flat();
    if (training.length < 10) continue;
    folds.push({ training, validation: groups.slice(cut, end).flat() });
  }
  if (!folds.length) {
    throw new Error('The training portion needs at least two distinct timestamps and 10 earlier rows for chronological model comparison.');
  }
  return folds;
}

/** Only the outer training partition is accepted here. Final test rows have no role in selection. */
export function validationPlan(training, request) {
  const pool = selectionPool(training, request);
  const folds = request.split === 'time' ? timeFolds(pool, request.date) : randomFolds(pool, request);
  return { folds, poolSize: pool.length, sampled: pool.length < training.length };
}
