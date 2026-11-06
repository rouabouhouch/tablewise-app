// Small CART trees use a squared-error gain for numbers and a Gini gain for classes.
// Encoded column zero is the intercept. Only actual inputs can become split features.
function bestSplit(design, response, indices, total, classCount, minLeaf) {
  let best = null;
  let bestGain = 1e-12;
  const n = indices.length;
  for (let feature = 1; feature < design[0].length; feature++) {
    const first = design[indices[0]][feature];
    if (indices.every(i => design[i][feature] === first)) continue;
    const sorted = [...indices].sort((a, b) => design[a][feature] - design[b][feature]);
    const leftCounts = new Array(classCount).fill(0);
    const rightCounts = [...total.counts];
    let leftSquares = 0;
    let rightSquares = total.squares;
    let leftSum = 0;
    for (let cursor = 0; cursor < n - 1; cursor++) {
      const label = response[sorted[cursor]];
      if (classCount) {
        leftSquares += 2 * leftCounts[label] + 1;
        rightSquares += 1 - 2 * rightCounts[label];
        leftCounts[label]++;
        rightCounts[label]--;
      } else {
        leftSum += label;
      }
      const leftN = cursor + 1, rightN = n - leftN;
      const low = design[sorted[cursor]][feature], high = design[sorted[cursor + 1]][feature];
      if (leftN < minLeaf || rightN < minLeaf || low === high) continue;
      const gain = classCount
        ? leftSquares / leftN + rightSquares / rightN - total.squares / n
        : (leftSum / leftN - (total.sum - leftSum) / rightN) ** 2 * leftN * rightN / n;
      if (gain > bestGain) {
        bestGain = gain;
        // Using the lower observed value also handles adjacent floating-point values.
        const midpoint = low + (high - low) / 2;
        best = { feature, threshold: midpoint < high ? midpoint : low };
      }
    }
  }
  return best;
}

export function fitTree(design, targets, classes, { maxDepth, minLeaf }) {
  const classCount = classes.length;
  const center = classCount ? 0 : targets.reduce((a, b) => a + b, 0) / targets.length;
  const scale = classCount ? 1 : Math.max(...targets.map(value => Math.abs(value - center))) || 1;
  const response = targets.map(value => classCount ? classes.indexOf(value) : (value - center) / scale);
  let leaves = 0, depthUsed = 0;

  function grow(indices, depth) {
    depthUsed = Math.max(depthUsed, depth);
    const counts = new Array(classCount).fill(0);
    let sum = 0;
    for (const index of indices) {
      if (classCount) counts[response[index]]++;
      else sum += response[index];
    }
    const node = { value: classCount ? classes[counts.indexOf(Math.max(...counts))] : center + scale * (sum / indices.length) };
    const pure = classCount ? Math.max(...counts) === indices.length : indices.every(i => response[i] === response[indices[0]]);
    if (depth < maxDepth && indices.length >= 2 * minLeaf && !pure) {
      const totals = { sum, counts, squares: counts.reduce((acc, value) => acc + value * value, 0) };
      const split = bestSplit(design, response, indices, totals, classCount, minLeaf);
      if (split) {
        const left = [], right = [];
        for (const index of indices) {
          (design[index][split.feature] <= split.threshold ? left : right).push(index);
        }
        return { ...node, ...split, left: grow(left, depth + 1), right: grow(right, depth + 1) };
      }
    }
    leaves++;
    return node;
  }
  const tree = grow(design.map((_, index) => index), 0);
  return { tree, leaves, depthUsed };
}
