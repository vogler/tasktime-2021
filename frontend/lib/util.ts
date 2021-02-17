export const delay = (time: number) => new Promise(res => setTimeout(res, time));

export namespace duration { // formatDuration from date-fns has no way to customize units, default e.g. 7 days 5 hours 9 minutes 30 seconds
  // duration as shortest string given units xs, leading zero only for tail
  let fmt = (t: number, xs: number[]) : string => {
    const [d,...ds] = xs;
    return d
      ? (t >= d ? fmt(Math.floor(t/d), ds) + ':' + (t%d+'').padStart(2, '0') : t.toString())
      : t.toString();
  }
  // up to d:hh:mm:ss, head unit w/o leading zero
  export const format = (s: number) => fmt(s, [60,60,24]);
}

export const equals = <T>(a: T, b: T): boolean => {
  // console.log('equals', a === b, a, b, typeof a, typeof b);
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.every((v,i) => equals(v, b[i]));
  }
  if (a instanceof Object && b instanceof Object) {
    return Object.entries(a).every(([k,v]) => equals(v, b[k as keyof T]));
  }
  return false;
}

// flat object diff, deep: https://github.com/mattphillips/deep-object-diff
export const diff = <T extends {}>(a: T, b: T) => Object.fromEntries(Object.entries(b).filter(([k,v],i) => !equals(v, a[k as keyof T])));

export const cmpBy = <X,Y>(f: (_:X) => Y, order: 'asc' | 'desc' = 'asc') => (a: X, b: X) => {
  const c = f(a); const d = f(b);
  const r = c < d ? -1 : c > d ? 1 : 0;
  return order == 'asc' ? r : r*-1;
};
