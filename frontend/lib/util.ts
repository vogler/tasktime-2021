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
// beware that without the argument it uses US as default and not the browser's locale!
export const toDateLS = (d: Date) => d.toLocaleDateString(navigator.language);
export const toTimeLS = (d: Date) => d.toLocaleTimeString(navigator.language);

export const equals = <T>(a: T, b: T): boolean => {
  // console.log('equals', a === b, a, b, typeof a, typeof b);
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.every((v, i) => equals(v, b[i]));
  }
  if (a instanceof Object && b instanceof Object) {
    return Object.entries(a).every(([k, v]) => equals(v, b[k as keyof T]));
  }
  return false;
};

// flat object diff, deep: https://github.com/mattphillips/deep-object-diff
export const diff = <T extends {}>(a: T, b: T) => Object.fromEntries(Object.entries(b).filter(([k, v], i) => !equals(v, a[k as keyof T])));

export const cmpBy = <X, Y>(f: (_: X) => Y, order: 'asc' | 'desc' = 'asc') => (a: X, b: X) => {
  const c = f(a);
  const d = f(b);
  const r = c < d ? -1 : c > d ? 1 : 0;
  return order == 'asc' ? r : r * -1;
};

// group a sorted list of entries into a list of the groups
// could also just reduce to an object, but only follows insertion-order for non-numbers since ES2015 and would limit Y to Symbol, see https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order
export const groupBy = <X,Y> (f: (x: X) => Y, entries: X[]) => {
  const r: {group: Y, entries: X[]}[] = [];
  let curGroup: Y;
  let i = -1;
  entries.forEach(entry => {
    const group = f(entry);
    if (group != curGroup) {
      r[++i] = {group, entries: []};
      curGroup = group;
    }
    r[i].entries.push(entry);
  });
  return r;
};
