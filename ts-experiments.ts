namespace newtype {
  {
    type newtype <t, s> = t & {s: never}
    type eur = newtype<number, 'eur'>
    const eur = <eur>1
    const num: number = eur
  }
  {
    const brand = <t,s> (x: t, brand: s) => x as t & {brand: s}
    const eur = brand(1, 'eur' as const)
    const num: number = eur
  }
}

namespace map_union { // via distributive conditional
  type model = {
    'foo': { a: 1 },
    'bar': { b: 2 },
    'baz': { c: 3 },
  }

  type variant <m extends keyof model> = model[m] & {model: m};
  declare function get <m1 extends keyof model, m2 extends keyof model> (m1: m1, m2: m2) : variant<m1> | variant<m2>;

  const x = get('foo', 'baz');
  if (x.model == 'foo') {
    x.a
  } else {
    x.c
  }

  // type map<f, x> = x extends any ? f<x> : never;
  type varianta<m extends keyof model> = m extends unknown ? model[m] & { model: m } : never;

  declare function geta <m extends keyof model> (...ms: m[]) : varianta<m>;

  const y = geta('foo', 'baz'); // variant<"foo" | "baz">
  if (y.model == 'foo') {
    y.a
  }
}

type UnionToIntersection<U> = (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never

namespace union_intersection {
  type a = {a: number, c: 'c' | 'ca'}
  type b = {b: number, c: 'c' | 'cb'}

  declare function qa(x: a): a
  declare function qb(x: b): b
  type d = {a: typeof qa, b: typeof qb}
  // type q = typeof qa | typeof qb
  const find = <m extends keyof d, f extends d[m], a extends Parameters<f>[number]> (...ms: m[]) => (args: a) => {
    type r = m extends any ? f extends d[m] ? ReturnType<f> & {model: m} : never : never;
    return {} as r;
  }
  find('a', 'b')({c: 'ca', a: 1})

  type cov <t> = () => t
  type cov2 <t> = t extends () => infer u ? u : never
  // argument should only allow .c
  declare function f_union(x: a | b): a | b
  declare function f_inter(x: a & b): a & b
  // contravariant union also allows .a and .b, and 'ca'|'cb' for .c
  f_union({c:'ca', a:1}) // returns .c
  // intersection is ok for values of .c, but requires all fields:
  f_inter({c:'c', a:1, b:1}) // returns .a .b .c

  // declare function f_union_cb(cb: () => a|b): a | b
  // f_union_cb(() => ({c:1}))
  declare function f_union_cb(x: () => a | b): a | b
  // f_union_cb(() => ({c:1}))
}


type equal<a, b> = [a] extends [b] ? ([b] extends [a] ? true : false) : false
type ai = {a: number, c?: 'c' | 'ca'}
type bi = {b: number, c?: 'c' | 'cb'}
type a = {select?: ai | null | undefined, ca: number, d?: 'd' | 'da'}
type b = {select?: bi | null | undefined, cb: number, d?: 'd' | 'db'}

// type inter_bin <a, b> = equal<a,b> extends true ? never : { [k in keyof a & keyof b]: inter<a[k]> | inter<b[k]> }
// type inter_map <t, u> = t extends object ? inter_bin <t, u> : t
// type inter <t> = inter_map <t, t>
// type x1 = inter<a|b> // filters out non-inter keys, but does not intersect values
// type x2 = UnionToIntersection<inter<a|b>> // same values, so intersection does not change anything

// inter<a|b> -> inter_map <a|b, a|b>
// -> inter_bin<a, a|b> | inter_bin<b, a|b>
// -> {select: inter<ai> | inter<ai|bi>, d: inter<'d'|'da'> | inter<'d'|'da'|'db'}
//  | {select: inter<bi> | inter<ai|bi>, d: inter<'d'|'db'> | inter<'d'|'da'|'db'}


type InterKeys<e, u> = e extends object ? { [k in keyof e & keyof u]: InterKeys<e[k], u[k]> } : e
type CoInter<t> = UnionToIntersection<InterKeys<t, t>>

type x = CoInter<a|b|undefined>
declare function f_union_cov(x: x)
f_union_cov({select: {c: 'c'}, d: 'd'})

import prisma from '@prisma/client'; // default import since CJS does not support named import
type arg = {
  select?: prisma.Prisma.TimeSelect | null | undefined;
  include?: prisma.Prisma.TimeInclude | null | undefined;
  where?: prisma.Prisma.TimeWhereInput | undefined;
  orderBy?: prisma.Prisma.TimeOrderByInput | prisma.Prisma.TimeOrderByInput[] | undefined;
  cursor?: prisma.Prisma.TimeWhereUniqueInput | undefined;
  take?: number | undefined;
  skip?: number | undefined;
  distinct?: "todoId" | "at" | "end" | ("todoId" | "at" | "end")[] | undefined;
} | {
  select?: prisma.Prisma.TodoMutationSelect | null | undefined;
  include?: prisma.Prisma.TodoMutationInclude | null | undefined;
  where?: prisma.Prisma.TodoMutationWhereInput | undefined;
  orderBy?: prisma.Prisma.TodoMutationOrderByInput | prisma.Prisma.TodoMutationOrderByInput[] | undefined;
  cursor?: prisma.Prisma.TodoMutationWhereUniqueInput | undefined;
  take?: number | undefined;
  skip?: number | undefined;
  distinct?: "text" | "done" | "todoId" | "at" | ("text" | "done" | "todoId" | "at")[] | undefined;
} | undefined;
type ui = UnionToIntersection<arg>
const ui: ui = {orderBy: {text: 'desc'}} // with the copied type UnionToIntersection is enough?!
type xp = CoInter<arg> // with CoInter<u[k]> above we get: Type of property 'parent' circularly references itself in mapped type ...

// the above loses information whether a field was optional
type aa = {foo?: number | string, a:'a'} | {foo?: number | undefined, b:'b'}
type xa = InterKeys<aa,aa>

type o = {a?: number | undefined}
type oa = o['a'] // just number
type om = {[k in keyof o]: o[k]} // same as o
type ks = keyof o & keyof o // same as just keyof o
type ob = {[k in keyof o & keyof o]: o[k]} // {a: number} - wtf? can add ? after o] to make every field optional.

type i = UnionToIntersection<{} | {} | undefined>

// https://stackoverflow.com/questions/57683303/how-can-i-see-the-full-expanded-contract-of-a-typescript-type/57683652#57683652
// expands object types one level deep
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// expands object types recursively
type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T;
