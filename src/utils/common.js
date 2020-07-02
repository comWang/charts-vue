const throttle = (fn, env = null, delay = 15, isImmediate = false) => {
  let timer = null;
  let start = null;
  return function(...rest) {
    if (!start) {
      start = new Date();
      if (isImmediate) fn.apply(env, rest);
      else timer = setTimeout(() => fn.apply(env, rest), delay);
    } else {
      clearTimeout(timer);
      const now = new Date();
      if (now - start >= delay) {
        fn.apply(env, rest);
        start = null;
      } else {
        timer = setTimeout(() => fn.apply(env, rest), delay);
        start = now;
      }
    }
  };
}

const throttleFrame = (fn, env = null) => {
  let timer = null;
  return function(...rest) {
    if (timer) cancelAnimationFrame(timer);
    timer = requestAnimationFrame(() => {
      timer = null;
      fn.apply(env, rest);
    });
  }
}

const elegantPromise = promise => {
  return new Promise((resolve) => {
    promise
      .then(data => resolve([null, data]))
      .catch(err => resolve([err, null]))
  })
}

export { throttle, throttleFrame, elegantPromise };