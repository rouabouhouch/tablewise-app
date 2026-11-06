import { train } from './ml/pipeline.js';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: train(data.dataset, data.options) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
