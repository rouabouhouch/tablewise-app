import { LIMITS } from '../limits.js?v=6ee401bc68a87739';
import { isMissing, parseDate, parseNumber } from '../data/values.js?v=6ee401bc68a87739';
import { shuffled } from '../data/random.js?v=6ee401bc68a87739';

function labelledRows(records, request) {
  const { task, target, features, split, date } = request;
  const keyColumns = [target.index, ...features.map(column => column.index)];
  if (split === 'time') keyColumns.push(date);
  const seen = new Set();
  const rows = [];
  let excluded = 0;
  let duplicates = 0;

  for (const row of records) {
    const label = row[target.index];
    if (isMissing(label) || (task === 'regression' && parseNumber(label) === null)) {
      excluded++;
      continue;
    }
    const key = JSON.stringify(keyColumns.map(index => row[index]));
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    rows.push(row);
  }
  return { rows, excluded, duplicates };
}

function sample(rows, { split, date }) {
  if (split !== 'time') return shuffled(rows).slice(0, LIMITS.modelRows);
  if (date == null || rows.some(row => parseDate(row[date]) === null)) {
    throw new Error('For a time split, choose an ISO date column with no missing or invalid dates.');
  }
  return [...rows].sort((a, b) => parseDate(a[date]) - parseDate(b[date])).slice(-LIMITS.modelRows);
}

function stratifiedHoldout(rows, classes, targetIndex) {
  const training = [];
  const testing = [];
  for (const label of classes) {
    const group = rows.filter(row => row[targetIndex] === label);
    if (group.length < 10) {
      throw new Error(`Each target category needs at least 10 distinct rows. "${label}" has ${group.length}.`);
    }
    const testSize = Math.max(2, Math.round(group.length * 0.2));
    testing.push(...group.slice(0, testSize));
    training.push(...group.slice(testSize));
  }
  return { training, testing };
}

function orderedHoldout(rows, { split, date }) {
  let cut = Math.floor(rows.length * 0.8);
  if (split === 'time') {
    const boundary = parseDate(rows[cut][date]);
    while (cut > 0 && parseDate(rows[cut - 1][date]) === boundary) cut--;
  }
  if (cut < 40 || rows.length - cut < 10) {
    throw new Error('This split leaves too few rows. Use more distinct dates or a random split.');
  }
  return { training: rows.slice(0, cut), testing: rows.slice(cut) };
}

export function partition(records, request) {
  const eligible = labelledRows(records, request);
  const available = eligible.rows.length;
  if (available < 60) {
    throw new Error('At least 60 distinct labelled rows are needed. Try a larger dataset or different inputs.');
  }

  const rows = sample(eligible.rows, request);
  const classification = request.task === 'classification';
  const targetIndex = request.target.index;
  const classes = classification ? [...new Set(rows.map(row => row[targetIndex]))].sort() : [];
  if (classification && (classes.length < 2 || classes.length > 8)) {
    throw new Error('Classification needs a target with 2 to 8 categories.');
  }

  const holdout = classification && request.split !== 'time'
    ? stratifiedHoldout(rows, classes, targetIndex)
    : orderedHoldout(rows, request);
  if (classes.some(label => holdout.training.filter(row => row[targetIndex] === label).length < 5)) {
    throw new Error('Some categories have too few training examples in this split.');
  }
  return {
    ...holdout, classes, available, excluded: eligible.excluded, duplicates: eligible.duplicates,
    sampled: available > rows.length,
  };
}
