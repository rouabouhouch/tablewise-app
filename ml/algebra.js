export function dot(left, right) {
  let product = 0;
  for (let index = 0; index < left.length; index++) product += left[index] * right[index];
  return product;
}

// Gauss-Jordan elimination with partial pivoting for the small ridge system.
export function solveLinearSystem(coefficients, constants) {
  const size = constants.length;
  const augmented = coefficients.map((row, index) => [...row, constants[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) {
      throw new Error('These inputs cannot support a stable model. Try fewer columns.');
    }
    for (let entry = column; entry <= size; entry++) augmented[column][entry] /= divisor;
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let entry = column; entry <= size; entry++) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }
  return augmented.map(row => row[size]);
}
