import { train } from './ml/pipeline.js?v=6ee401bc68a87739';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: train(data.dataset, data.options) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
