import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(compress());


// oauth with grant
import session from 'express-session';
import grant, { GrantSession } from 'grant';
const auth_config = {
  'defaults': {
    'origin': process.env.auth_origin ?? `http://localhost:${port}`, // no good way to get URL of server, so we configure it via .env; could get it from request: req.headers.host = localhost:8080, req.hostname = localhost, os.hostname() = Ralfs-MBP.fritz.box; https://github.com/simov/grant/issues/227
    'transport': 'session',
    'state': true
  },
  'google': {
    'key': process.env.auth_google_key,
    'secret': process.env.auth_google_secret,
    'response': ['tokens', 'profile'],
    'scope': ['openid', 'email', 'profile'],
    'nonce': true,
    'custom_params': { 'access_type': 'offline' },
    'callback': '/signin'
  }
};
app.use(session({secret: 'track-time', saveUninitialized: true, resave: false}));
app.use(grant.express(auth_config));
const fmtJSON = (js: any) => JSON.stringify(js, null, 2);
app.get('/signin', (req, res) => {
    const session = req.session as typeof req.session & { grant: GrantSession }; // otherwise need to ts-ignore access to req.session.grant
    res.end(fmtJSON(session.grant.response));
  });
app.get('/login', (req, res) => {
  res.end('<html>Access denied! <a href="/connect/google">Login</a></html>');
});
app.get('/logout', (req, res) => {
  req.session.destroy(console.log);
  res.redirect('/');
});
// app.get('/env', (req,res) => {
//   res.end(fmtJSON(process.env));
// });
const isProtected = (url: string) => ['/db', '/todo'].filter(prefix => url.startsWith(prefix)).length != 0
const isAuthorized = (req: express.Request) => {
  if(!isProtected(req.url)) return true;
  const session = req.session as typeof req.session & { grant?: GrantSession }; // otherwise need to ts-ignore access to req.session.grant
  const token = session.grant?.response?.access_token;
  console.log(req.url, token);
  if (!token) return false;
  // TODO verify token, get userId and use in queries
  return true;
};
app.use((req, res, next) => {
  console.log(req.method, req.url, req.body, req.session);
  if (isAuthorized(req)) {
    next();
  } else {
    res.redirect('/login');
  }
});


// access database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports. See https://github.com/prisma/prisma/pull/4920
import prisma from '@prisma/client'; // default import since CJS does not support named import
const db = new prisma.PrismaClient();

// deprecated manual REST API -> too much boilerplate -> expose db below
app.use('/todo', async (req, res) => {
  console.log(req.method, req.url, req.body);
  const args = req.body;
  let op;
  switch (req.method) {
    case 'GET':
      op = db.todo.findMany(args); // where, orderBy etc.
      break;
    case 'POST':
      op = db.todo.create(args);
      break;
    case 'PUT':
      op = db.todo.update(args);
      break;
    case 'DELETE':
      op = db.todo.delete(args);
      break;
    default:
      throw Error(`Invalid method ${req.method}`);
  }
  res.json(await op);
});


// const match = <T> (cases: {[k: string]: T}, pattern: string) => cases[pattern];
const fail = (m: string) => { throw new Error(m) };
// custom version (nicer error & cast) of: assert(a.includes(k as typeof a[number]));
const assertIncludes_ = <A extends readonly unknown[], K extends A[number]> (a: A, k: K | string): K =>
  a.includes(k) ? k as K : fail(`Invalid parameter: ${k} is not in [${a.join(', ')}]!`);
// the following also complains about k not in a at compile-time, from https://gitter.im/Microsoft/TypeScript?at=6019d7a09fa6765ef8f3f1da
function assertIncludes<A extends readonly unknown[], K extends A[number]>(a: A, k: K): K;
function assertIncludes<A extends readonly string[], K extends string>(a: A, k: string extends K ? K : never): A[number];
function assertIncludes(a: readonly string[], k: string): string {
  return a.includes(k) ? k : fail(`Invalid parameter: ${k} is not in [${a.join(', ')}]!`);
}

import { inspect } from 'util';
import { actions, models, include, todoOrderBy, historyOpt, ModelName, Model, Await } from '../shared/db';

// The following are experiments to allow union queries (also see top of History.tsx) - the main point of this file is the endpoint /db/:model/:action

// unions are not supported by prisma (see readme), use raw SQL (order by fixed), example posted at https://github.com/prisma/prisma/issues/2505#issuecomment-785229500
const db_union = <m extends ModelName> (...ms: m[]) : Promise<Model<m>[]> => {
  const joins = ms.map(m => `(select *, \'${m}\' as "model" from "${m}") as "_${m}"`).join(' natural full join ');
  // db.$queryRaw`...` does not allow variables for tables, TODO SQL injection?
  return db.$queryRaw(`select * from ${joins} order by "at" desc`); // TODO type-safe orderBy on intersection of fields?
}

app.get('/db/union-raw/:models', async (req, res) => {
  console.log(req.url, req.params, req.body);
  try {
    const models = Object.keys(ModelName) as (keyof typeof ModelName)[];
    const ms = req.params.models.split(',').map(m => assertIncludes(models, m));
    res.json(await db_union(...ms));
  } catch (error) {
    res.status(400).json({ error: error.toString() });
  }
});

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
const unionFindMany = <M extends ModelName, F extends Delegate<M>['findMany'], A extends Parameters<F>[number]> (...ms: M[]) => async (arg: A) => {
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

app.post('/db/union/:models', async (req, res) => {
  console.log(req.url, inspect(req.body, { depth: null, colors: true }));
  try {
    const models = Object.keys(ModelName) as (keyof typeof ModelName)[];
    const ms = req.params.models.split(',').map(m => assertIncludes(models, m));
    const xs = await unionFindMany(...ms)(req.body);
    res.json(xs);
  } catch (error) {
    res.status(400).json({ error: error.toString() });
  }
});

// serves db.model.action(req.body)
app.post('/db/:model/:action', async (req, res) => {
  console.log(req.url, inspect(req.body, { depth: null, colors: true }));
  try {
    const model = assertIncludes(models, req.params.model);
    const action = assertIncludes(actions, req.params.action); // see PrismaAction, but no value for the type
    // @ts-ignore
    const r = await db[model][action](req.body);
    res.json(r);
  } catch (error) {
    res.status(400).json({ error: error.toString() });
  }
});

const react_routes = ['/history']; // URL is rewritten by react-router (not to /#history), so on refresh the server would not find /history
app.get(react_routes, async (req, res, next) => {
  console.log('reroute', req.url, 'to /');
  // res.sendFile('/index.html'); // no such file (since static handled by snowpack), also we want snowpack to patch the file for HMR
  req.url = '/'; // can't write req.path
  next();
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});


// replaces empty list in .js files with rows from the db
// this way the client does not have to issue a second request and wait to display data
// TODO SSR with ReactDOMServer.renderToString to also serve the HTML
// besides snowpack example, also see https://github.com/DavidWells/isomorphic-react-example
const replacements = {
  '/dist/Tasks.js': [
    { variable: 'dbTodos',
      query: () => db.todo.findMany({include, orderBy: todoOrderBy}) },
  ],
  '/dist/History.js': [
    { variable: 'dbTimes',
      query: () => db.time.findMany(historyOpt) },
    { variable: 'dbTodoMutations',
      query: () => db.todoMutation.findMany(historyOpt) },
  ],
};
const fillData = async (url: string, js: string) => {
  const file = url.replace(/\?.*$/, ''); // strip query string of HMR requests which append ?mtime=...
  type file = keyof typeof replacements;
  // type r = typeof replacements[file][number]; // error on reduce below: none of those signatures are compatible with each other
  type r = { variable: string, query: () => Promise<any> }; // can't call reduce on incompatible Promise types
  if (file in replacements) { // file is not narrowed to file because of subtyping and lack of closed types
    const rs: r[] = replacements[file as file]; // so we need to assert the type on both (rs up, file down)
    return await rs.reduce((a, r) => a.then(async s => s.replace(
      `const ${r.variable} = [];`, // more generic: regex with .* instead of [], but can't easily use variable in regex
      `const ${r.variable} = ${JSON.stringify(await r.query())};`)), Promise.resolve(js));
  }
  return js;
}

// snowpack build on demand, HMR and SSR:
// https://www.snowpack.dev/guides/server-side-render#option-2%3A-on-demand-serving-(middleware)
if (process.env.NODE_ENV != 'production') {
  const { startServer, loadConfiguration } = await import('snowpack');
  // TODO remove open: 'none' once we can set port to open: https://github.com/snowpackjs/snowpack/discussions/2415
  const overrides = { devOptions: { port: 8081, hmrPort: 8082, open: 'none' } }; // Can browse :8080 since it will fallback on :8081 to bundle resources that are not covered by the routes above. If we do not set hmrPort, HMR will not work on :8080 since it would try to talk to that port.
  const config = await loadConfiguration(overrides, ''); // loads snowpack.config.cjs (.cjs instead of .js needed because it's internally loaded with require instead of import)
  const server = await startServer({ config, lockfile: null }); // this starts a separate server on devOptions.port and a websocket for HMR on devOptions.hmrPort!

  // snowpack: build each file on request and respond with its built contents
  app.use(async (req, res, next) => {
    try {
      const buildResult = await server.loadUrl(req.url);
      // console.log('snowpack.loadUrl:', req.url, '->', buildResult.originalFileLoc, `(${buildResult.contentType})`);
      if (buildResult.contentType)
        res.contentType(buildResult.contentType);
      res.send(await fillData(req.url, buildResult.contents.toString()));
    } catch (err) {
      console.error('loadUrl failed for', req.method, req.url);
      res.sendStatus(404);
      next(err);
    }
  });
} else { // above snowpack serves frontend-static/ and dist/ on demand and modifies index.html for HMR
  // in production we first do `npm run build` which puts both in build/
  const { readFileSync } = await import('fs');
  const fileContents = Object.fromEntries(Object.keys(replacements).map(s => [s, readFileSync(`./build${s}`).toString()]));

  app.get(Object.keys(replacements), async (req, res) => {
    res.contentType('application/javascript');
    res.send(await fillData(req.url, fileContents[req.url]));
  });
  app.use(express.static('build'));
}
