// const match = <T> (cases: {[k: string]: T}, pattern: string) => cases[pattern];
const fail = (m: string) => { throw new Error(m) };
// custom version (nicer error & cast) of: assert(a.includes(k as typeof a[number]));
const assertIncludes_ = <A extends readonly unknown[], K extends A[number]> (a: A, k: K | string): K =>
  a.includes(k) ? k as K : fail(`Invalid parameter: ${k} is not in [${a.join(', ')}]!`);
// the following also complains about k not in a at compile-time, from https://gitter.im/Microsoft/TypeScript?at=6019d7a09fa6765ef8f3f1da
export function assertIncludes<A extends readonly unknown[], K extends A[number]>(a: A, k: K): K;
export function assertIncludes<A extends readonly string[], K extends string>(a: A, k: string extends K ? K : never): A[number];
export function assertIncludes(a: readonly string[], k: string): string {
  return a.includes(k) ? k : fail(`Invalid parameter: ${k} is not in [${a.join(', ')}]!`);
}

export const capitalize = <S extends string> (s: S) => s[0].toUpperCase() + s.slice(1) as Capitalize<S>;
export const uncapitalize = <S extends string> (s: S) => s[0].toLowerCase() + s.slice(1) as Uncapitalize<S>;

class GenericError <T> extends Error {
  constructor(public message: string, public o: T) {
      // super(message + ', ' + (typeof o == 'object' ? 'toString' in o ? (o as any).toString() : JSON.stringify(o) : o));
      super(message);
      // Set the prototype explicitly.
      Object.setPrototypeOf(this, GenericError.prototype);
  }
}
// try {
//   throw new GenericError('no', 123);
// } catch (e) {
//   if (e instanceof GenericError) {
//     console.log(e.o); // o is still any
//   }
// }

export class HttpError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
// try {
//   throw new HttpError('no', 400);
// } catch (e) {
//   if (e instanceof HttpError) {
//     console.log(e.status);
//   }
// }
