import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(compress());

// access sqlite database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports. See https://github.com/prisma/prisma/pull/4920
import prisma from '@prisma/client'; // import default export instead of named exports
const db = new prisma.PrismaClient();

app.use("/todo", async (req: Request, res: Response) => {
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

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});

import { initialTodoOrderBy } from '../frontend/defaults'; // TODO put in shared folder?

// replaces empty initialTodos in js with data from the db
// this way the client does not have to issue a second request and wait to display data
// TODO SSR with ReactDOMServer.renderToString to also serve the HTML
// besides snowpack example, also see https://github.com/DavidWells/isomorphic-react-example
const fillTodos = async (js: string) =>
  js.replace(
    'const initialTodos = [];',
    `const initialTodos = ${JSON.stringify(await db.todo.findMany({include: {times: true}, orderBy: initialTodoOrderBy}))};`
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
        r = await fillTodos(r.toString());
      }
      res.send(r);
    } catch (err) {
      console.error('loadUrl failed for', req.method, req.url);
      next(err);
    }
  });
} else { // above snowpack serves frontend-static/ and dist/ on demand and modifies index.html for HMR
  // in production we first do `npm run build` which puts both in build/
  const { readFileSync } = await import('fs');
  const appjs = readFileSync('./build/dist/App.js').toString();

  app.get('/dist/App.js', async (req: Request, res: Response) => {
    res.contentType('application/javascript');
    res.send(await fillTodos(appjs));
  });
  app.use(express.static('build'));
}
