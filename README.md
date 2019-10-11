# @pxtrn/async-backoff

Backoff failing async calls until they successfully complete.
Usefull for recoverable errors that most likely go away on retry.
For example errors like  `ENOTFOUND`, `EHOSTUNREACH` etc. on network calls or
`EBUSY` on file system calls.   

## Installation

`npm install --save @pxtrn/async-backoff`


## Usage

```js
const backoff = require('@pxtrn/async-backoff');

let counter = 1;

async function request() {
  console.log(`request number: ${counter}`);

  if(counter < 5) {
    counter ++;
    throw new Error('Some Network error');
  }

  console.log(`successfully requestd resource`);
  return true;
}


(async function() {
  try {
    const result = await backoff(request, {maxAttempts: 5, retryTimeout: 100});
  } catch(err) {
    console.error('Could not request resource');
  }
})();
```

#### Parameters

- `fn` {async Function} Async function to await
- `options` {Object}
  - `maxAttempts`: {Integer} Max number of function calls
  - `retryTimeout`: {Integer} ms to wait.
      Only for default delayStrategy (return attempts * retryTimeout)
  - `retryStrategy`: {Function(err)} return boolean true if another call to fn
      should be tryed, even maxAttempts has not been reached yet
  - `delayStrategy`: {Function(attempts)} return an integer in ms for which the
      next attempt should be delayed


#### Custom retry strategy

```js
await backoff(request, {
  maxAttempts: 5,
  retryStrategy: function(err) {
    const retryErrors = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT'];
    return retryErrors.includes(err.code);
  }
});
```

#### Custom delay strategy

```js
await backoff(request, {
  maxAttempts: 5,
  delayStrategy: function(attempts) {
    return (Math.pow(2, attempts) * 100);
  }
});
```
