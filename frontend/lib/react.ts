import { useEffect, useRef } from 'react';

export const useDepEffect: typeof useEffect = (f, deps) => { // skips initial render call, only calls f if deps actually change
  const didMountRef = useRef(false);

  useEffect(() => {
    if (didMountRef.current)
      return f(); // for onDestroy
    else didMountRef.current = true;
  }, deps);
};

// call an async function f; not sync since we can't await the wrapped call! Might be lead to data races. Also can't get T out.
const breakPromise = <T>(f: () => Promise<T>) => () => {
  (async () => await f())();
};

// allows async callback; has no onDestroy! maybe use https://github.com/rauldeheer/use-async-effect
export const useAsyncEffect = (f: () => Promise<void>, deps: React.DependencyList) =>
  useEffect(breakPromise(f), deps);

export const useAsyncDepEffect: typeof useAsyncEffect = (f, deps) =>
  useDepEffect(breakPromise(f), deps);

// more hooks: https://github.com/streamich/react-use
