import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(compress());

// access database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports. See https://github.com/prisma/prisma/pull/4920
import prisma from '@prisma/client'; // default import since CJS does not support named import
const db = new prisma.PrismaClient();

// deprecated manual REST API -> too much boilerplate -> expose db below
app.use('/todo', async (req: Request, res: Response) => {
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
import { actions, models, include, todoOrderBy, todoInclude } from '../shared/db';
import { readFile } from 'snowpack/lib/util';

// serves db.model.action(req.body)
app.post('/db/:model/:action', async (req: Request, res: Response) => {
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
app.get(react_routes, async (req: Request, res: Response, next: express.NextFunction) => {
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
      query: () => db.time.findMany({include: todoInclude, orderBy: {start: 'desc'}}) },
    { variable: 'dbTodoMutations',
      query: () => db.todoMutation.findMany({include: todoInclude, orderBy: {at: 'desc'}}) },
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
  app.use(async (req: Request, res: Response, next: express.NextFunction) => {
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

  app.get(Object.keys(replacements), async (req: Request, res: Response) => {
    res.contentType('application/javascript');
    res.send(await fillData(req.url, fileContents[req.url]));
  });
  app.use(express.static('build'));
}
