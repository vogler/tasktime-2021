import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = 8080;

app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(compress());
// app.use(express.static('frontend-static')); // snowpack modifes index.html for HMR

// access sqlite database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports. See https://github.com/prisma/prisma/pull/4920
import prisma from '@prisma/client'; // import default export instead of named exports
const db = new prisma.PrismaClient();

app.get("/todo", async (req: Request, res: Response) => {
  const todos = await db.todo.findMany();
  res.json(todos);
});

app.post("/todo", async (req: Request, res: Response) => {
  console.log(req.body);
  res.json(await db.todo.create({ data: req.body }));
});

app.put("/todo", async (req: Request, res: Response) => {
  res.json(await db.todo.update({
    where: { id: parseInt(req.body.id) },
    data: req.body }));
});

app.delete("/todo", async (req: Request, res: Response) => {
  res.json(await db.todo.delete({ where: { id: parseInt(req.body.id) }}));
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});


// snowpack build on demand and SSR:
// https://www.snowpack.dev/guides/server-side-render#option-2%3A-on-demand-serving-(middleware)
import { startServer, loadConfiguration } from 'snowpack';
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
    // serve initial data so that client does not have to wait for fetch request to display data
    // TODO SSR with ReactDOMServer.renderToString to also serve the HTML
    // besides snowpack example, also see https://github.com/DavidWells/isomorphic-react-example
    if (req.url === '/dist/App.js') {
      r = r.toString().replace(
        'const initialTodos = [];',
        `const initialTodos = ${JSON.stringify(await db.todo.findMany())};`
      );
    }
    res.send(r);
  } catch (err) {
    console.error('loadUrl failed for', req.method, req.url);
    next(err);
  }
});
