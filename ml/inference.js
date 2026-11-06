import { encodeRow } from './encoding.js?v=1919cefb67302b76';
import { dot } from './algebra.js?v=1919cefb67302b76';

/** Score an encoded row. Older models without an algorithm field use their original linear path. */
export function predictEncoded(model, vector, depthLimit = Infinity) {
  if (model.algorithm === 'baseline') return model.constant;
  if (model.algorithm === 'tree') {
    let node = model.tree;
    for (let depth = 0; node.left && depth < depthLimit; depth++) {
      node = vector[node.feature] <= node.threshold ? node.left : node.right;
    }
    return node.value;
  }
  if (model.task === 'regression') return dot(vector, model.weights) * model.yScale + model.yMean;
  const scores = model.weights.map(coefficients => dot(vector, coefficients));
  return model.classes[scores.indexOf(Math.max(...scores))];
}

export function predict(model, row) {
  return predictEncoded(model, encodeRow(row, model.specs));
}
