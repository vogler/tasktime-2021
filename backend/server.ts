import express, { Request, Response } from 'express';
const app = express();
const port = 8080;

// app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(compress());
// app.use(express.static('frontend-static')); // snowpack modifes index.html for HMR

// access sqlite database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports.
// CommonJS modules can always be imported via the default export, for example...
import prisma from '@prisma/client';
const db = new prisma.PrismaClient();

app.get("/posts", async (req: Request, res: Response) => {
  const posts = await db.post.findMany();
  res.json(posts);
});

const todos = [{
  date: Date.now(),
  text: 'Todo 1',
  done: false
},
{
  date: Date.now() + 42,
  text: 'Todo 2',
  done: true
}];

app.get("/todos", (req: Request, res: Response) => {
  res.json(todos);
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
    if (req.url === '/dist/App.js') {
      r = r.toString().replace(
        'const initialTodos = [];',
        `const initialTodos = ${JSON.stringify(todos)};`
      );
    }
    res.send(r);
  } catch (err) {
    next(err);
  }
});
