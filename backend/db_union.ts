import type prisma from '@prisma/client'; // default import since CJS does not support named import
import { ModelName, Model, Await } from '../shared/db';
import { db } from './server';

// The following are experiments to allow union queries (also see top of History.tsx)

// unions are not supported by prisma (see readme), use raw SQL (order by fixed), example posted at https://github.com/prisma/prisma/issues/2505#issuecomment-785229500
export const naturalFullJoin = <m extends ModelName> (...ms: m[]) : Promise<Model<m>[]> => {
  const joins = ms.map(m => `(select *, \'${m}\' as "model" from "${m}") as "_${m}"`).join(' natural full join ');
  // db.$queryRaw`...` does not allow variables for tables, TODO SQL injection?
  return db.$queryRaw(`select * from ${joins} order by "at" desc`); // TODO type-safe orderBy on intersection of fields?
}

// The above works, but is missing prisma's options like include, select, where, orderBy etc.
// For include we could join above, but then we'd have to implement the object creation from db fields etc.
// So the following is the union of findMany on several models, and subsequent merge sort in case of orderBy, otherwise just concat+flatten.
// Beware that arg is also the union, but contravariant! So if you pass some field that is not in the intersection, the query will only fail at run-time!
// Attempted fix:
  // UnionToIntersection on arg resulted in never. Not clear why - if I copy the inferred type w/o UnionToIntersection and apply it after, it works. Intersection on objects means union of keys (like arguments -> contravariant) but this should not be a problem on the top-level since they're the same for every query and keys of nested objects seem to be intersected.
  type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never
  // Covariant union as arg would intersect keys, but not values. Also, there are no variance annotations anyway.
  // Alternatively tried to intersect both keys and values, but seems like UnionToIntersection alone would do the right thing.
  type InterKeys<e, u> = e extends object ? { [k in keyof (e|u)]: InterKeys<e[k], u[k]> } : e // NB: [k in keyof e & keyof u] lost info about optional!
  // With CoInter<u[k]> instead of u[k] above applied on copied original type we get: Type of property 'parent' circularly references itself in mapped type ...
  type NonNeverKeys<T> = { [K in keyof T]: T[K] extends never ? never : K }[keyof T];
  type StripNever<T> = T extends object ? { [K in NonNeverKeys<T>]: StripNever<T[K]>} : T;
  type CoInter<t> = StripNever<UnionToIntersection<InterKeys<t, t>>>
  // The above worked in tests with plain nested objects, but in the function below it resulted in Parameters<typeof query>[number] = {} | {} | undefined w/o UnionToIntersection and in never with.
type Delegate <M extends ModelName> = prisma.PrismaClient[Uncapitalize<M>]
export const unionFindMany = <M extends ModelName, F extends Delegate<M>['findMany'], A extends Parameters<F>[number]> (...ms: M[]) => async (arg: A) => {
  // Distributive conditional types (naked type parameter) are distributed over union types. Can't define a type-level map due to lack of higher kinded types.
  // First conditional maps over models (R<m1 | m2> -> R<m1> | R<m2>); second conditional establishes constraint F on new M - without we'd get the cross-product.
  type row = M extends any ? F extends Delegate<M>['findMany'] ? Await<ReturnType<F>>[number] & {model: M} : never : never;
  const uc = (m: ModelName) => m[0].toLowerCase() + m.slice(1) as Uncapitalize<ModelName>;
  const ps = ms.map(uc).map(async model =>
    // @ts-ignore This expression is not callable. Each member of the union type '...' has signatures, but none of those signatures are compatible with each other.
    (await db[model].findMany(arg)).map(r => ({...r, model})) as row[] // no way to introduce a fresh type/existential?
  );
  const rs = await Promise.all(ps); // rows for each model
  if (arg?.orderBy) {
    // TODO use merge sort instead of flatten + sort since lists in rs are already sorted
    // @ts-ignore Type 'TimeOrderByInput' has no properties in common with type '{ [k in keyof row]?: {} | "asc" | "desc" | undefined; }'.
    return rs.flat().sort(cmpBy(arg.orderBy));
  }
  return rs.flat();
}

export const cmpBy = <X, K extends keyof X, O extends 'asc' | 'desc' | {}, OB extends {[k in K]?: O}>(orderBy: OB | OB[]) => (a: X, b: X) => {
  const cmp = <T>(c: T, d: T) => c < d ? -1 : c > d ? 1 : 0;
  const ord = (c: number, o: O) => o == 'asc' ? c : c * -1;
  const orderBys = orderBy instanceof Array ? orderBy : [orderBy];
  return orderBys.map(Object.entries).flat().reduce((r, [k,o]) => r == 0 ? ord(cmp(a[k as K], b[k as K]), o as O) : r, 0);
};

async () => { // unapplied, just here to check the types
  const q = unionFindMany(ModelName.Time, ModelName.TodoMutation);
  type arg1 = Parameters<typeof q>[number]; // { ... } | { ... } | undefined
  type arg2 = UnionToIntersection<arg1>; // never - why? If I copy the inferred type of arg1 from IntelliSense and apply UnionToIntersection, it works?!
  const xs = await unionFindMany(ModelName.Time, ModelName.TodoMutation)({include: {todo: true}, orderBy: [{todoId: 'desc'}, {at: 'desc'}]});
  const x = xs[0];
  if (x.model == ModelName.Time) {
    x // prisma.Time & { model: "Time"; } but lacking the include in the type :(
  }
};
