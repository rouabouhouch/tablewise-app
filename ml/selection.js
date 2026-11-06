import { candidateGrid, fitCandidate, prepareTraining, tasks } from './candidates.js?v=1919cefb67302b76';
import { encodeRow } from './encoding.js?v=1919cefb67302b76';
import { predictEncoded } from './inference.js?v=1919cefb67302b76';
import { validationPlan } from './validation.js?v=1919cefb67302b76';

/** Rank a predefined search grid with out-of-fold predictions on training rows alone. */
export function compareOnTraining(training, request) {
  const { task, target } = request;
  const metric = task === 'regression' ? 'mae' : 'macroF1';
  const { folds, poolSize, sampled } = validationPlan(training, request);
  const candidates = candidateGrid(task);
  const results = candidates.map(candidate => ({ ...candidate, predicted: [], foldScores: [] }));
  const maxDepthCandidate = candidates.at(-1);
  const actual = [];
  const classes = task === 'classification' ? [...new Set(training.map(row => row[target.index]))].sort() : [];

  for (const fold of folds) {
    const frame = prepareTraining(fold.training, request, true);
    const labels = fold.validation.map(row => tasks[task].label(row[target.index]));
    const vectors = fold.validation.map(row => encodeRow(row, frame.specs));
    actual.push(...labels);
    let deepestTree;
    for (const record of results) {
      if (record.error) continue;
      try {
        let fitted;
        if (record.algorithm === 'tree') {
          // CART's earlier splits do not depend on the depth limit. All nodes
          // retain their prediction, so a depth-limited traversal is exact pruning.
          deepestTree ??= fitCandidate(frame, maxDepthCandidate);
          fitted = deepestTree;
        } else {
          fitted = fitCandidate(frame, record);
        }
        const scores = vectors.map(vector => predictEncoded(fitted, vector, record.parameters.maxDepth));
        const foldScore = tasks[task].metrics(labels, scores, classes)[metric];
        if (!Number.isFinite(foldScore)) throw new Error('This setting produced an invalid validation score.');
        record.foldScores.push(foldScore);
        record.predicted.push(...scores);
      } catch (error) {
        record.error = error.message;
      }
    }
  }

  const leaderboard = results.map(({ predicted, ...record }) => {
    if (record.error) return { ...record, score: null };
    const score = tasks[task].metrics(actual, predicted, classes)[metric];
    return Number.isFinite(score) ? { ...record, score } : { ...record, error: 'Invalid pooled score.', score: null };
  });
  // A stable sort breaks exact ties in grid order: baseline first, then
  // regularized linear fits, then trees from shallowest to deepest.
  leaderboard.sort((left, right) => {
    if (left.score === null) return right.score === null ? 0 : 1;
    if (right.score === null) return -1;
    return metric === 'mae' ? left.score - right.score : right.score - left.score;
  });
  return {
    metric, leaderboard, poolSize, sampled, validatedRows: actual.length,
    scheme: request.split === 'time' ? 'expanding time windows' : task === 'classification' ? 'stratified folds' : 'seeded folds',
    folds: folds.map(fold => ({ training: fold.training.length, validation: fold.validation.length })),
  };
}
