// const express = require("express");
import express, {Request, Response} from 'express';
const app = express();
const port = 8090;

// define a route handler for the default home page
app.get("/foo", (req: Request, res: Response) => {
  res.send("Hello worlds!");
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});


// https://www.snowpack.dev/guides/server-side-render#option-2%3A-on-demand-serving-(middleware)
import { startServer, loadConfiguration } from 'snowpack';
const config = await loadConfiguration({}, ''); // loads snowpack.config.cjs (.cjs instead of .js needed because it's internally loaded with require instead of import)
const server = await startServer({ config, lockfile: null });

// snowpack: build each file on request and respond with its built contents
app.use(async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const buildResult = await server.loadUrl(req.url);
    res.send(buildResult.contents);
  } catch (err) {
    next(err);
  }
});
