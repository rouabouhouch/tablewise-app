import { mean } from '../data/statistics.js?v=6ee401bc68a87739';
import { dot } from './algebra.js?v=6ee401bc68a87739';

const EPOCHS = 240;
const PENALTY = 0.005;

function fit(design, targets, classes) {
  const labels = targets.map(value => classes.indexOf(value));
  const width = design[0].length;
  const weights = classes.map(() => Array(width).fill(0));

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const gradients = classes.map(() => Array(width).fill(0));
    for (const [record, vector] of design.entries()) {
      const scores = weights.map(coefficients => dot(vector, coefficients));
      const highest = Math.max(...scores);
      const exponents = scores.map(score => Math.exp(score - highest));
      const denominator = exponents.reduce((sum, value) => sum + value, 0);
      for (let label = 0; label < classes.length; label++) {
        const error = exponents[label] / denominator - Number(labels[record] === label);
        for (let feature = 0; feature < width; feature++) gradients[label][feature] += error * vector[feature];
      }
    }
    const rate = 0.2 / Math.sqrt(1 + epoch / 60);
    for (let label = 0; label < classes.length; label++) {
      for (let feature = 0; feature < width; feature++) {
        const regularization = feature === 0 ? 0 : PENALTY * weights[label][feature];
        weights[label][feature] -= rate * (gradients[label][feature] / design.length + regularization);
      }
    }
  }
  return { weights };
}

function baseline(targets, classes) {
  const counts = classes.map(label => targets.filter(value => value === label).length);
  return classes[counts.indexOf(Math.max(...counts))];
}

function metrics(actual, predicted, classes) {
  const matrix = classes.map(() => classes.map(() => 0));
  actual.forEach((label, index) => {
    matrix[classes.indexOf(label)][classes.indexOf(predicted[index])]++;
  });
  const f1 = matrix.map((row, index) => {
    const truePositives = row[index];
    const predictedCount = matrix.reduce((sum, entries) => sum + entries[index], 0);
    const actualCount = row.reduce((sum, count) => sum + count, 0);
    return 2 * truePositives / (predictedCount + actualCount) || 0;
  });
  return { accuracy: mean(actual.map((label, i) => Number(label === predicted[i]))), macroF1: mean(f1), matrix };
}

export const softmax = { label: value => value, fit, baseline, metrics };
