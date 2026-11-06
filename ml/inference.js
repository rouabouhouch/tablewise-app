import { encodeRow } from './encoding.js?v=6ee401bc68a87739';
import { dot } from './algebra.js?v=6ee401bc68a87739';

/** Score one raw row using the encoding and weights saved in a fitted model. */
export function predict(model, row) {
  const vector = encodeRow(row, model.specs);
  if (model.task === 'regression') {
    return dot(vector, model.weights) * model.yScale + model.yMean;
  }
  const scores = model.weights.map(coefficients => dot(vector, coefficients));
  return model.classes[scores.indexOf(Math.max(...scores))];
}
