import { mean, standardDeviation } from '../data/statistics.js?v=1919cefb67302b76';
import { parseNumber } from '../data/values.js?v=1919cefb67302b76';
import { solveLinearSystem } from './algebra.js?v=1919cefb67302b76';

function fit(design, targets, classes, penalty = 1) {
  const width = design[0].length;
  const gram = Array.from({ length: width }, () => Array(width).fill(0));
  const response = Array(width).fill(0);
  if (new Set(targets).size < 2) {
    throw new Error('The target is constant in the training set. There is nothing to learn.');
  }
  const yMean = mean(targets);
  const yScale = standardDeviation(targets, yMean) || 1;

  for (const [record, vector] of design.entries()) {
    const label = (targets[record] - yMean) / yScale;
    for (let row = 0; row < width; row++) {
      response[row] += vector[row] * label;
      for (let column = 0; column < width; column++) gram[row][column] += vector[row] * vector[column];
    }
  }
  // Apply L2 to features. Only a numerical stabilizer goes on the intercept.
  gram[0][0] += 1e-9;
  for (let index = 1; index < width; index++) gram[index][index] += penalty;
  return { weights: solveLinearSystem(gram, response), yMean, yScale };
}

function metrics(actual, predicted) {
  if (predicted.some(value => !Number.isFinite(value))) {
    throw new Error('These numeric ranges are too extreme for a stable model. Rescale the input first.');
  }
  const average = mean(actual);
  const residuals = actual.map((value, i) => value - predicted[i]);
  const squaredError = residuals.reduce((sum, error) => sum + error ** 2, 0);
  const totalVariance = actual.reduce((sum, value) => sum + (value - average) ** 2, 0);
  return {
    mae: mean(residuals.map(Math.abs)), rmse: Math.sqrt(squaredError / actual.length),
    r2: totalVariance ? 1 - squaredError / totalVariance : null,
  };
}

export const ridge = {
  label: parseNumber,
  fit,
  baseline: mean,
  metrics,
};
