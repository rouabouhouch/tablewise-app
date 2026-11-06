const workerFailure = 'The model could not run in this browser. Try a current browser with module worker support.';

export class TrainingClient {
  #worker = null;
  #createWorker;

  constructor(createWorker = () => new Worker(new URL('../worker.js', import.meta.url), { type: 'module' })) {
    this.#createWorker = createWorker;
  }

  get running() { return this.#worker !== null; }

  cancel() {
    if (!this.#worker) return;
    const worker = this.#worker;
    this.#worker = null;
    worker.onmessage = worker.onerror = worker.onmessageerror = null;
    worker.terminate();
  }

  start(dataset, options, onComplete) {
    this.cancel();
    try {
      const worker = this.#createWorker();
      this.#worker = worker;
      const finish = message => {
        // An already queued event from a cancelled job cannot replace a new model.
        if (this.#worker !== worker) return;
        this.cancel();
        onComplete(message);
      };
      worker.onmessage = event => finish(event.data);
      worker.onerror = worker.onmessageerror = () => finish({ error: workerFailure });
      worker.postMessage({ dataset, options });
    } catch {
      this.cancel();
      onComplete({ error: 'This browser could not start the local model worker.' });
    }
  }
}
