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
import { actions, models, include, dbTodoOrderBy, timeInclude } from '../shared/db';

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


// replaces empty list in App.js with rows from the db
// this way the client does not have to issue a second request and wait to display data
// TODO SSR with ReactDOMServer.renderToString to also serve the HTML
// besides snowpack example, also see https://github.com/DavidWells/isomorphic-react-example
const fillData = async (js: string) =>
  js.replace(
    'const dbTodos = [];',
    `const dbTodos = ${JSON.stringify(await db.todo.findMany({include, orderBy: dbTodoOrderBy}))};`
  ).replace(
    'const dbTimes = [];',
    `const dbTimes = ${JSON.stringify(await db.time.findMany({include: timeInclude, orderBy: {end: 'desc'}}))};`
  );

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
      let r = buildResult.contents;
      if (req.url.startsWith('/dist/App.js')) {
        r = await fillData(r.toString());
      }
      res.send(r);
    } catch (err) {
      console.error('loadUrl failed for', req.method, req.url);
      res.sendStatus(404);
      next(err);
    }
  });
} else { // above snowpack serves frontend-static/ and dist/ on demand and modifies index.html for HMR
  // in production we first do `npm run build` which puts both in build/
  const { readFileSync } = await import('fs');
  const appjs = readFileSync('./build/dist/App.js').toString();

  app.get('/dist/App.js', async (req: Request, res: Response) => {
    res.contentType('application/javascript');
    res.send(await fillData(appjs));
  });
  app.use(express.static('build'));
}
