import { compareModels } from './ml/pipeline.js?v=1919cefb67302b76';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: compareModels(data.dataset, data.options) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
