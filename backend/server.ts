import express from 'express';
import { readFileSync } from 'fs';
import { inspect } from 'util';

// access database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports. See https://github.com/prisma/prisma/pull/4920
import prisma from '@prisma/client'; // default import since CJS does not support named import
export const db = new prisma.PrismaClient();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
// app.use(cookieParser());

// https://web.dev/uses-text-compression/ recommends brotli
// https://github.com/Alorel/shrink-ray has brotli and async cache but did not compile on heroku due to missing g++
import shrinkRay from 'shrink-ray-current';
app.use(shrinkRay());
// https://github.com/expressjs/compression supports deflate and gzip, no cache?
// import compression from 'compression';
// app.use(compression()); // compress all responses on the fly?
// static compression in webpack: https://tech.treebo.com/a-tale-of-brotli-compression-bcb071d9780a
// https://github.com/yosuke-furukawa/server-timing


// oauth with grant
import session from 'express-session';
import grant, { GrantSession } from 'grant';
declare module 'express-session' { // fields we want to add to session
  interface SessionData {
    userId: number
    email: string
    grant: GrantSession
  }
}
// https://github.com/expressjs/session#secret should be random from env to avoid session hijacking`
// default session store: "Warning: connect.session() MemoryStore is not designed for a production environment, as it will leak memory, and will not scale past a single process." -> use https://github.com/kleydon/prisma-session-store
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
const ms_day = 1000*60*60*24;
const store = new PrismaSessionStore(db, {ttl: ms_day*14, checkPeriod: ms_day});
app.use(session({secret: 'track-time', saveUninitialized: false, resave: false, store})); // defaults: httpOnly
const auth_config = {
  'defaults': {
    'origin': process.env.auth_origin ?? `http://localhost:${port}`, // set dynamically below, https://github.com/simov/grant/issues/227
    'transport': 'session',
    'state': true,
    'nonce': true,
    'callback': '/signin',
    'scope': ['email'],
  },
  'google': { // https://console.developers.google.com/
    'key': process.env.auth_google_key,
    'secret': process.env.auth_google_secret,
    'custom_params': { 'access_type': 'offline' },
    'scope': ['openid', 'email', 'profile'],
    'response': ['tokens', 'profile'],
  },
  'github': { // https://github.com/settings/applications/1492468
    'key': process.env.auth_github_key,
    'secret': process.env.auth_github_secret,
    'scope': ['read:user', 'user:email'],
  },
  'facebook': { // https://developers.facebook.com/apps/
    'key': process.env.auth_facebook_key,
    'secret': process.env.auth_facebook_secret,
    'scope': ['email', 'public_profile'], // {name: string, id: string}; email is not returned by oauth! have to query after.
  },
  'twitter': { // https://developer.twitter.com/en/portal/projects
    'key': process.env.auth_twitter_key,
    'secret': process.env.auth_twitter_secret,
  }
};
type google_profile = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}
// app.all('/connect/:provider', (req, res, next) => { // dynamically set origin
//   const origin = process.env.auth_origin ?? req.headers.referer?.replace(/\/$/, '') ?? `https://${req.headers.host}`;
//   res.locals.grant = {dynamic: {origin}};
//   console.log(req.originalUrl, res.locals.grant);
//   next();
// });
app.use(grant.express(auth_config));
import axios from 'axios';
import Twitter from 'twitter';
app.get('/signin', async (req, res) => {
  const provider = req.session.grant?.provider;
  // console.log(req.session.grant);
  if (!provider) return res.status(500).end('OAuth provider missing!');
  const r = req.session.grant?.response;
  const token = r?.access_token;
  if (!r || !token) return res.status(500).end('Did not get access_token from OAuth provider!');
  const user: prisma.Prisma.UserCreateInput = {email: '', name: '', provider};
  if (provider == 'google') {
    const profile = r.profile as google_profile;
    user.email = profile.email;
    user.name = profile.name;
    user.first_name = profile.given_name;
    user.last_name = profile.family_name;
    user.locale = profile.locale;
    user.picture = profile.picture;
  }
  if (provider == 'github') {
    const {data} = await axios.get(`https://api.github.com/user`, {headers: {'Authorization': `token ${token}`}});
    user.email = data.email;
    user.name = data.name;
    user.picture = data.avatar_url;
    if (!data.email) { // https://stackoverflow.com/questions/35373995/github-user-email-is-null-despite-useremail-scope
      const {data} = await axios.get(`https://api.github.com/user/emails`, {headers: {'Authorization': `token ${token}`}});
      const emails = data as {email: string, primary: boolean, verified: boolean, visibility?: string}[];
      const email = emails.filter(o => o.primary)[0];
      user.email = email.email;
    }
  }
  if (provider == 'facebook') {
    const {data} = await axios.get(`https://graph.facebook.com/me?fields=email,name,first_name,last_name,locale,picture&access_token=${token}`);
    console.log('query email from facebook', data);
    user.email = data.email;
    user.name = data.name;
    user.first_name = data.first_name;
    user.last_name = data.last_name;
    // somehow locale is missing
    user.picture = data.picture.data.url;
  }
  if (provider == 'twitter') {
    // console.log(await axios.get(`https://api.twitter.com/1.1/account/verify_credentials.json?access_token=${token}&include_email=true`)); // 400 Bad Authentication data.
    // use lib send signed oauth headers:
    const client = new Twitter({consumer_key: process.env.auth_twitter_key ?? '', consumer_secret: process.env.auth_twitter_secret ?? '', access_token_key: r.access_token ?? '', access_token_secret: r.access_secret ?? ''});
    const data = await client.get('account/verify_credentials.json', {include_email: true});
    console.log('query email from twitter', data);
    user.email = data.email;
    user.name = data.name;
    user.picture = data.profile_image_url_https;
  }
  if (!user.email || user.email == '') return res.status(500).end('Did not get email from OAuth provider!');;
  req.session.email = user.email;
  const dbUser = await db.user.upsert({where: {email: user.email}, update: user, create: user}); // assumes that email identifies user across providers
  console.log('signin', user.email, dbUser);
  req.session.userId = dbUser.id;
  res.redirect('/');
});
app.get('/logout', async (req, res) => {
  console.log('logout', req.session.email);
  const r = req.session.grant?.response;
  const token = r?.access_token;
  const provider = req.session.grant?.provider;
  if (req.query.revoke && r && token) { // if not revoked, login will be automatic and not allow to choose a different account
    try {
      if (provider == 'google') {
          await axios.post(`https://oauth2.googleapis.com/revoke?token=${token}`);
      }
      if (provider == 'github') {
        // https://docs.github.com/en/rest/reference/apps#delete-an-app-token
        // doc is out of date, description is correct, example is missing basic auth, without it it errors with "message": "Not Found"
        // deprecated, but see link to blog post: https://docs.github.com/en/rest/reference/apps#revoke-a-grant-for-an-application
        await axios.delete(`https://api.github.com/applications/${process.env.auth_github_key}/token`, {data: {access_token: token}, auth: {username: process.env.auth_github_key ?? '', password: process.env.auth_github_secret ?? ''}});
      }
      if (provider == 'facebook') { // https://developers.facebook.com/docs/facebook-login/permissions/requesting-and-revoking#revokelogin
        await axios.delete(`https://graph.facebook.com/me/permissions?access_token=${token}`);
      }
      if (provider == 'twitter') { // https://developer.twitter.com/en/docs/authentication/api-reference/invalidate_bearer_token
        const client = new Twitter({consumer_key: process.env.auth_twitter_key ?? '', consumer_secret: process.env.auth_twitter_secret ?? '', access_token_key: r.access_token ?? '', access_token_secret: r.access_secret ?? ''});
        console.log(await client.post('oauth/invalidate_token', {access_token: token}));
      }
      console.log('revoked token for', req.session.email, 'on', provider);
    } catch (e) {
      console.error(e);
    }
  }
  req.session.destroy(console.log);
  res.redirect('/');
});
app.use('/db', (req, res, next) => {
  console.log(req.method, req.originalUrl, inspect(req.body, { depth: null, colors: true })); // , req.session
  if (!req.session.userId || !req.session.email) {
    console.log('Not authenticated!');
    return res.status(401).json({error: 'Not authenticated! Please login.'});
  }
  // console.log('Authenticated as', req.session.email);
  // req.body = {...req.body, where: {...req.body.where, userId: req.session.userId}}; // can't just extend with all possible conditions since prisma complains about excess fields
  next();
});


// db endpoints
import { action, model, actions, models, include, todoOrderBy, historyOpt, ModelName } from '../shared/db';
import { assertIncludes, capitalize, HttpError, uncapitalize } from './util';
import { naturalFullJoin, unionFindMany } from './db_union';

// Throws an error if user is not authorized for action on model; make sure to use await!
// Only needs to query db in case of TodoWhereUniqueInput, otherwise patches where to include userId.
const authorized = async (req: express.Request, res: express.Response, model_ac: model | Capitalize<model>, action: action) => {
  // TODO check that user in query matches user from token, or somehow add user to queries on server?
  const userId = req.session.userId;
  const arg = req.body;
  const where = arg?.where;
  if (!userId) throw new HttpError('Not authenticated! Please login.', 401);
  const model = capitalize(model_ac);
  if (model == ModelName.Todo) {
    if (action == 'create' && arg?.data?.user?.connect?.id == userId) return;
    if (where?.userId == userId) return;
    if (where?.id || !where?.userId) {
      // where.userId = userId; // can't add: TodoWhereUniqueInput needs exactly one argument, but you provided id and userId.
      const todo = await db.todo.findUnique({where});
      if (todo?.userId == userId) return;
    }
  } else if (model == ModelName.Time || model == ModelName.TodoMutation) {
    if (where?.todo?.userId == userId) return;
    if (where?.todoId && !where.todo) {
      where.todo = {userId}; // patch request
      return;
    }
  }
  throw new HttpError(`Not authorized: /db/${uncapitalize(model_ac)}/${action} ${JSON.stringify(arg)}`, 403);
};

// The following are experiments to allow union queries (also see top of History.tsx) - the main endpoint for db access is the below /db/:model/:action

// raw query with natural full join, fixed order by "at" desc
app.get('/db/union-raw/:models', async (req, res) => {
  try {
    const models = Object.keys(ModelName) as (keyof typeof ModelName)[];
    const ms = req.params.models.split(',').map(m => assertIncludes(models, m));
    await Promise.all(ms.map(m => authorized(req, res, m, 'findMany')));
    res.json(await naturalFullJoin(...ms));
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    console.error(status, error.message);
    res.status(status).json({ error: error.message });
  }
});

// generic union of findMany over models, merge, sort. Caveats: arg type unsound, arg does not influence return type.
app.post('/db/union/:models', async (req, res) => {
  try {
    const models = Object.keys(ModelName) as (keyof typeof ModelName)[];
    const ms = req.params.models.split(',').map(m => assertIncludes(models, m));
    await Promise.all(ms.map(m => authorized(req, res, m, 'findMany')));
    const xs = await unionFindMany(...ms)(req.body);
    res.json(xs);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    console.error(status, error.message);
    res.status(status).json({ error: error.message });
  }
});

// serves db.model.action(req.body)
app.post('/db/:model/:action', async (req, res) => {
  try {
    const model = assertIncludes(models, req.params.model);
    const action = assertIncludes(actions, req.params.action); // see PrismaAction, but no value for the type
    await authorized(req, res, model, action);
    // @ts-ignore
    const r = await db[model][action](req.body);
    res.json(r);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    console.error(status, error.message);
    res.status(status).json({ error: error.message });
  }
});


// replaces empty list in .js files with rows from the db
// this way the client does not have to issue a second request and wait to display data
// TODO SSR with ReactDOMServer.renderToString to also serve the HTML
// besides snowpack example, also see https://github.com/DavidWells/isomorphic-react-example
const replacements = {
  '/dist/App.js': [
    { variable: 'user',
      query: (id: number) => db.user.findUnique({where: {id}}) },
  ],
  '/dist/Tasks.js': [
    { variable: 'dbTodos',
      query: (userId: number) => db.todo.findMany({include, orderBy: todoOrderBy, where: {userId}}) },
  ],
  '/dist/History.js': [
    { variable: 'dbTimes',
      query: (userId: number) => db.time.findMany({...historyOpt, where: {todo: {userId}}}) },
    { variable: 'dbTodoMutations',
      query: (userId: number) => db.todoMutation.findMany({...historyOpt, where: {todo: {userId}}}) },
  ],
};
const fillData = async (req: express.Request, js: string, bundled = false) => {
  const file = req.url.replace(/\?.*$/, ''); // strip query string of HMR requests which append ?mtime=...
  type file = keyof typeof replacements;
  // type r = typeof replacements[file][number]; // error on reduce below: none of those signatures are compatible with each other
  type r = { variable: string, query: (userId: number) => Promise<any> }; // can't call reduce on incompatible Promise types
  let rs: r[] = [];
  if (bundled) { // if we use a bundler, we do all the replacements in index.js
    rs = Object.values(replacements).flat();
  } else if (file in replacements) { // file is not narrowed to file because of subtyping and lack of closed types
    rs = replacements[file as file]; // so we need to assert the type on both (rs up, file down)
  }
  const userId = req.session.userId;
  if (userId && rs.length) {
    console.log('fillData', file, rs.map(x => x.variable));
    return await rs.reduce((a, r) => a.then(async s => s.replace(
      new RegExp(`(const|var) ${r.variable} = .+;`), // can't use variable in /regexp/; esbuild replaces const with var :(
      `const ${r.variable} = ${JSON.stringify(await r.query(userId))};`)), Promise.resolve(js));
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
      res.send(await fillData(req, buildResult.contents.toString()));
    } catch (err) {
      console.error('loadUrl failed for', req.method, req.url);
      res.sendStatus(404);
      next(err);
    }
  });
} else { // above snowpack serves frontend-static/ and dist/ on demand and modifies index.html for HMR
  // in production we first do `npm run build` which puts both in build/
  const bundled = true; // TODO load from snowpack.config.cjs?
  // bundler combines files into index.js, so we do all the replacements there...
  const jsFiles = bundled ? ['/dist/index.js'] : Object.keys(replacements);
  const fileContents = Object.fromEntries(jsFiles.map(s => [s, readFileSync(`./build${s}`).toString()]));

  app.get(jsFiles, async (req, res) => {
    res.contentType('application/javascript');
    res.send(await fillData(req, fileContents[req.url], true)); // bundled = true
  });
  app.use(express.static('build'));
}

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
// import spdy from 'spdy'; // https://github.com/spdy-http2/node-spdy
// // https://ivanjov.com/running-express-koa-and-hapi-on-http-2/
// const spdy_options = {
//   // https://letsencrypt.org/docs/certificates-for-localhost/#making-and-trusting-your-own-certificates
//   key: readFileSync('./backend/localhost.key'),
//   cert:  readFileSync('./backend/localhost.crt')
// };
// spdy.createServer(spdy_options, app).listen(port, () => {
//   console.log(`server started at https://localhost:${port}`);
// });
// // -> fails with ERR_HTTP2_PROTOCOL_ERROR once session cookie is set. worked before node v15: https://github.com/spdy-http2/node-spdy/issues/380
// // also, how to get key/cert for heroku?
