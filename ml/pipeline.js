import { predict } from './inference.js';
import { profile } from '../data/profile.js';
import { trainingRequest } from './columns.js';
import { partition } from './partition.js';
import { encodeRow, featureWidth, fitEncoder } from './encoding.js';
import { ridge } from './ridge.js';
import { softmax } from './softmax.js';

// Each estimator operates only on encoded vectors. The pipeline owns the
// split, training-only encoder and holdout used by both model and baseline.
const estimators = { regression: ridge, classification: softmax };

function coefficientMagnitudes(model) {
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

export function train(dataset, options) {
  const request = trainingRequest(profile(dataset).columns, options);
  const { task, target, features, split } = request;
  const { training, testing, classes, available, excluded, duplicates, sampled } = partition(dataset.rows, request);
  const estimator = estimators[task];

  const specs = fitEncoder(training, features);
  const design = training.map(row => encodeRow(row, specs));
  const trainingLabels = training.map(row => estimator.label(row[target.index]));
  const model = {
    task, specs, classes, target: target.name, targetIndex: target.index,
    ...estimator.fit(design, trainingLabels, classes),
  };

  const actual = testing.map(row => estimator.label(row[target.index]));
  const predicted = testing.map(row => predict(model, row));
  const baselineValue = estimator.baseline(trainingLabels, classes);
  return {
    model,
    metrics: estimator.metrics(actual, predicted, classes),
    baseline: estimator.metrics(actual, actual.map(() => baselineValue), classes),
    points: task === 'regression' ? actual.slice(0, 300).map((value, i) => [value, predicted[i]]) : undefined,
    effects: coefficientMagnitudes(model),
    trainCount: training.length, testCount: testing.length, available, excluded, duplicates, sampled, split,
  };
}
