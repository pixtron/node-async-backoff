
const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

class Backoff {
  constructor(options) {
    options = {
      maxAttempts: 50,
      retryTimeout: 10,
      ...options
    };

    this.attempts = 0;
    this.maxAttempts = options.maxAttempts;
    this.retryTimeout = options.retryTimeout;

    if(options.retryStrategy && typeof options.retryStrategy === 'function') {
      this.retryStrategy = options.retryStrategy;
    }

    if(options.delayStrategy && typeof options.delayStrategy === 'function') {
      this.delayStrategy = options.delayStrategy;
    }
  }

  retryStrategy(err) {
    return true;
  }

  delayStrategy(attempts) {
    return this.retryTimeout * this.attempts;
  }

  async tryUntilFail(fn) {
    try {
      this.attempts++;
      return await fn();
    } catch(err) {
      const shouldRetry = this.retryStrategy(err);
      if(shouldRetry && this.attempts < this.maxAttempts) {
        await timeout(this.delayStrategy(this.attempts));
        return await this.tryUntilFail(fn);
      } else {
        throw err;
      }
    }
  }
}

module.exports = async function Factory(fn, options) {
  const backoff = new Backoff(options);

  return backoff.tryUntilFail(fn);
}
