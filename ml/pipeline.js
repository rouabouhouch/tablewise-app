import { predict } from './inference.js?v=1919cefb67302b76';
import { profile, profileColumn } from '../data/profile.js?v=1919cefb67302b76';
import { trainingRequest } from './columns.js?v=1919cefb67302b76';
import { partition } from './partition.js?v=1919cefb67302b76';
import { featureWidth } from './encoding.js?v=1919cefb67302b76';
import { fitCandidate, linearCandidate, prepareTraining, tasks } from './candidates.js?v=1919cefb67302b76';
import { compareOnTraining } from './selection.js?v=1919cefb67302b76';

function coefficientMagnitudes(model) {
  if (!model.weights) return [];
  const groups = model.task === 'regression' ? [model.weights] : model.weights;
  let offset = 1;
  const effects = model.specs.map(spec => {
    let strength = 0;
    const next = offset + featureWidth(spec);
    for (const group of groups) {
      for (let index = offset; index < next; index++) strength += Math.abs(group[index]);
    }
    offset = next;
    return { name: spec.name, strength };
  });
  return effects.sort((left, right) => right.strength - left.strength);
}

function requestFor(dataset, options, compare) {
  if (!compare) return trainingRequest(profile(dataset).columns, options);
  // The user selects the schema and task before the split. Input types,
  // imputation and category vocabularies are learned within each fit.
  const columns = dataset.headers.map((name, index) => (
    index === options.target ? profileColumn(name, index, dataset.rows) : { name, index }
  ));
  return trainingRequest(columns, options, { foldLocalInputs: true });
}

function selectAndRefit(comparison, frame) {
  for (const candidate of comparison.leaderboard) {
    if (candidate.score === null) continue;
    try {
      const model = fitCandidate(frame, candidate);
      comparison.selectedId = candidate.id;
      return model;
    } catch (error) {
      // Full training can exceed the encoding limit even though smaller folds fit.
      // Try the next validation-ranked candidate without inspecting any test labels.
      candidate.refitError = error.message;
    }
  }
  throw new Error('No candidate could be fitted on the training rows.');
}

function runExperiment(dataset, options, compare) {
  const request = requestFor(dataset, options, compare);
  const { task, target, split } = request;
  const { training, testing, classes, available, excluded, duplicates, sampled } = partition(dataset.rows, request);
  const comparison = compare ? compareOnTraining(training, request) : null;
  const frame = prepareTraining(training, request, compare);
  const model = compare
    ? selectAndRefit(comparison, frame)
    : fitCandidate(frame, linearCandidate(task));
  if (!compare) {
    // Keep the original fixed-fit API's serialized model shape.
    delete model.algorithm;
    delete model.parameters;
  }

  const actual = testing.map(row => tasks[task].label(row[target.index]));
  const predicted = testing.map(row => predict(model, row));
  return {
    model, ...(comparison && { comparison }),
    metrics: tasks[task].metrics(actual, predicted, classes),
    baseline: tasks[task].metrics(actual, actual.map(() => frame.constant), classes),
    points: task === 'regression' ? actual.slice(0, 300).map((value, i) => [value, predicted[i]]) : undefined,
    effects: coefficientMagnitudes(model),
    trainCount: training.length, testCount: testing.length, available, excluded, duplicates, sampled, split,
  };
}

// Preserve the documented fixed-fit function for existing callers and saved models.
export function train(dataset, options) { return runExperiment(dataset, options, false); }

/** Compare candidate families and settings, refit the winner and evaluate it on the untouched test partition. */
export function compareModels(dataset, options) { return runExperiment(dataset, options, true); }
