
const timeout = (ms: number, signal?: AbortSignal) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (signal !== undefined) {
      // @ts-ignore: https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/57805
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(abortError());
      }, {once: true});
    }
  });
}

const abortError = () => new Error('The operation was aborted')

export interface BackoffOptions {
  maxAttempts: number; // maximum attempts an errornous async call should be retried
  retryTimeout: number; // timeout in ms multiplied with attempts
  retryStrategy?: (err: any) => boolean,
  delayStrategy?: (attempts: number) => number,
  signal?: AbortSignal,
}

type TFn<T = any> = (...args: any[]) => Promise<T>

class Backoff {
  protected _options: BackoffOptions;
  protected _attempts: number = 0;

  constructor(options: Partial<BackoffOptions>) {
    this._options = {
      maxAttempts: 50,
      retryTimeout: 10,
      ...options
    };
  }

  retryStrategy(err: any) {
    const { retryStrategy } = this._options;

    if (retryStrategy && typeof retryStrategy === 'function') {
      return retryStrategy(err);
    } else {
      return true;
    }
  }

  delayStrategy(attempts: number) {
    const { delayStrategy, retryTimeout } = this._options;

    if (delayStrategy && typeof delayStrategy === 'function') {
      return delayStrategy(attempts);
    } else {
      return retryTimeout * this._attempts;
    }
  }

  async tryUntilFail<T = any>(fn: TFn<T>): Promise<T> {
    const signal = this._options.signal;
    let shouldRetry = true;
    let err: any;

    if (signal !== undefined) {
      // @ts-ignore: https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/57805
      signal.addEventListener('abort', () => {
        shouldRetry = false;
        err = abortError();
      }, {once: true});
    }

    while (shouldRetry) {
      this._attempts++;

      try {
        if (signal?.aborted) throw abortError();

        const result = await fn();
        return result;
      } catch(e) {
        if (shouldRetry && this._attempts < this._options.maxAttempts && this.retryStrategy(e)) {
          if (signal?.aborted) throw abortError();

          await timeout(this.delayStrategy(this._attempts), signal);
        } else {
          err = e;
          shouldRetry = false;
        }
      }
    }

    throw err;
  }
}

export const backoff = async function<T = any>(fn: TFn<T>, options: BackoffOptions): Promise<T> {
 if (typeof fn !== 'function') throw new Error('backoff requires a function as first parameter');

 const backoff = new Backoff(options);

 return backoff.tryUntilFail<T>(fn);
};
export default backoff;
