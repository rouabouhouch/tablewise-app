import { profileColumn } from '../data/profile.js?v=1919cefb67302b76';
import { fitEncoder, encodeRow } from './encoding.js?v=1919cefb67302b76';
import { ridge } from './ridge.js?v=1919cefb67302b76';
import { softmax } from './softmax.js?v=1919cefb67302b76';
import { fitTree } from './tree.js?v=1919cefb67302b76';

export const tasks = { regression: ridge, classification: softmax };

export function linearCandidate(task, penalty = task === 'regression' ? 1 : 0.005) {
  const algorithm = task === 'regression' ? 'ridge' : 'softmax';
  const name = task === 'regression' ? 'Ridge regression' : 'Logistic classification';
  return { id: algorithm + '-' + penalty, algorithm, name, setting: 'L2 penalty ' + penalty, parameters: { penalty } };
}

export function candidateGrid(task) {
  const penalties = task === 'regression' ? [10, 1, 0.1] : [0.05, 0.005, 0.0005];
  return [
    { id: 'baseline', algorithm: 'baseline', name: 'Simple baseline',
      setting: task === 'regression' ? 'Training mean' : 'Most frequent class', parameters: {} },
    ...penalties.map(penalty => linearCandidate(task, penalty)),
    ...[2, 4, 6].map(maxDepth => ({
      id: 'tree-' + maxDepth, algorithm: 'tree', name: 'Decision tree',
      setting: `Depth ${maxDepth}, min. 5 per leaf`, parameters: { maxDepth, minLeaf: 5 },
    })),
  ];
}

// Fit one representation per training fold. Every candidate receives the same rows.
// The baseline can still be evaluated when a fold has no learnable input columns.
export function prepareTraining(rows, request, foldLocalInputs) {
  const { task, target } = request;
  const labels = rows.map(row => tasks[task].label(row[target.index]));
  const classes = task === 'classification' ? [...new Set(labels)].sort() : [];
  const frame = { task, target, labels, classes, constant: tasks[task].baseline(labels, classes), specs: [] };
  try {
    const inputs = foldLocalInputs
      ? request.features.map(column => profileColumn(column.name, column.index, rows))
          .filter(column => ['number', 'category'].includes(column.type))
      : request.features;
    if (inputs.some(column => column.type === 'category' && column.unique > 50)) {
      throw new Error('A training input has more than 50 categories.');
    }
    frame.specs = fitEncoder(rows, inputs);
    frame.design = rows.map(row => encodeRow(row, frame.specs));
  } catch (error) {
    frame.encodingError = error.message;
  }
  return frame;
}

export function fitCandidate(frame, candidate) {
  const { task, target, classes, labels, design } = frame;
  const { algorithm, parameters } = candidate;
  const model = { task, target: target.name, targetIndex: target.index, classes, algorithm, parameters, specs: frame.specs };
  if (algorithm === 'baseline') return { ...model, specs: [], constant: frame.constant };
  if (frame.encodingError) throw new Error(frame.encodingError);
  if (algorithm === 'tree') return { ...model, ...fitTree(design, labels, classes, parameters) };
  return { ...model, ...tasks[task].fit(design, labels, classes, parameters.penalty) };
}
