import express, { Request, Response } from 'express';
const app = express();
const port = 8080;

// app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(compress());
// app.use(express.static('frontend-static')); // snowpack modifes index.html for HMR

app.get("/foo", (req: Request, res: Response) => {
  res.send("Hello worlds!");
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});


// https://www.snowpack.dev/guides/server-side-render#option-2%3A-on-demand-serving-(middleware)
import { startServer, loadConfiguration } from 'snowpack';
const overrides = { devOptions: { port: 8081, hmrPort: 8082 } }; // Can browse :8080 since it will fallback on :8081 to bundle resources. If we do not set hmrPort, HMR will not work on :8080 since it would try to talk to that port.
const config = await loadConfiguration(overrides, ''); // loads snowpack.config.cjs (.cjs instead of .js needed because it's internally loaded with require instead of import)
const server = await startServer({ config, lockfile: null }); // this starts a separate server on devOptions.port and a websocket for HMR on devOptions.hmrPort!

// snowpack: build each file on request and respond with its built contents
app.use(async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const buildResult = await server.loadUrl(req.url);
    // console.log('snowpack.loadUrl:', req.url, '->', buildResult.originalFileLoc, `(${buildResult.contentType})`);
    if (buildResult.contentType)
      res.contentType(buildResult.contentType);
    res.send(buildResult.contents);
  } catch (err) {
    next(err);
  }
});
