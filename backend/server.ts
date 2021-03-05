import express from 'express';
import bodyParser from 'body-parser';
import { inspect } from 'util';

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
    // 'origin': process.env.auth_origin ?? `http://localhost:${port}`, // set dynamically below, https://github.com/simov/grant/issues/227
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
app.all('/connect/:provider', (req, res, next) => {
  const origin = process.env.auth_origin ?? req.headers.referer?.replace(/\/$/, '') ?? `https://${req.headers.host}`;
  res.locals.grant = {dynamic: {origin}};
  console.log(req.originalUrl, res.locals.grant);
  next();
});
app.use(session({secret: 'track-time', saveUninitialized: true, resave: false}));
app.use(grant.express(auth_config));
const fmtJSON = (js: any) => JSON.stringify(js, null, 2);
app.get('/signin', (req, res) => {
  // const session = req.session as typeof req.session & { grant: GrantSession }; // otherwise need to ts-ignore access to req.session.grant
  // res.end(fmtJSON(session.grant.response));
  // TODO save user in DB
  res.redirect('/');
});
type profile = { // just for google, same for others?
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}
const getAuth = (req: express.Request) => {
  const session = req.session as typeof req.session & { grant?: GrantSession }; // otherwise need to ts-ignore access to req.session.grant
  const r = session.grant?.response;
  if (!r || !r.access_token || !r.profile) return undefined;
  return r as typeof r & {profile: profile};
};
app.get('/logout', (req, res) => {
  console.log('logout', getAuth(req)?.profile.email)
  req.session.destroy(console.log);
  res.redirect('/');
});
const isAuthorized = (req: express.Request) => {
  // TODO verify token, get userId and use in queries
  return true;
};
app.use('/db', (req, res, next) => {
  console.log('check auth for', req.method, req.originalUrl, inspect(req.body, { depth: null, colors: true })); // , req.session
  const auth = getAuth(req);
  if (!auth?.access_token || !auth.profile) return res.status(401).json({error: 'Not authenticated'});
  console.log('Authenticated as', auth.profile.email);
  if (!isAuthorized(req)) return res.status(403).json({error: 'Not authorized'});
  next();
  // res.redirect('/login');
});


// access database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports. See https://github.com/prisma/prisma/pull/4920
import prisma from '@prisma/client'; // default import since CJS does not support named import
export const db = new prisma.PrismaClient();

import { actions, models, include, todoOrderBy, historyOpt, ModelName } from '../shared/db';
import { assertIncludes } from './util';
import { naturalFullJoin, unionFindMany } from './db_union';

// The following are experiments to allow union queries (also see top of History.tsx) - the main endpoint for db access is the below /db/:model/:action

// raw query with natural full join, fixed order by "at" desc
app.get('/db/union-raw/:models', async (req, res) => {
  try {
    const models = Object.keys(ModelName) as (keyof typeof ModelName)[];
    const ms = req.params.models.split(',').map(m => assertIncludes(models, m));
    res.json(await naturalFullJoin(...ms));
  } catch (error) {
    res.status(400).json({ error: error.toString() });
  }
});

// generic union of findMany over models, merge, sort. Caveats: arg type unsound, arg does not influence return type.
app.post('/db/union/:models', async (req, res) => {
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
    console.log('fillData', file, rs.map(x => x.variable));
    return await rs.reduce((a, r) => a.then(async s => s.replace(
      `const ${r.variable} = [];`, // more generic: regex with .* instead of [], but can't easily use variable in regex
      `const ${r.variable} = ${JSON.stringify(await r.query())};`)), Promise.resolve(js));
  }
  return js;
}


const react_routes = ['/history']; // URL is rewritten by react-router (not to /#history), so on refresh the server would not find /history
app.get(react_routes, async (req, res, next) => {
  console.log('reroute', req.url, 'to /');
  // res.sendFile('/index.html'); // no such file (since static handled by snowpack), also we want snowpack to patch the file for HMR
  req.url = '/'; // can't write req.path
  next();
});


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

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
