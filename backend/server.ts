import express from 'express';
import bodyParser from 'body-parser';
import { inspect } from 'util';

// access database with prisma:
// import { PrismaClient } from '@prisma/client'; // SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module, which may not support all module.exports as named exports. See https://github.com/prisma/prisma/pull/4920
import prisma from '@prisma/client'; // default import since CJS does not support named import
export const db = new prisma.PrismaClient();

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(compress());
// https://github.com/yosuke-furukawa/server-timing


// oauth with grant
import session from 'express-session';
declare module 'express-session' { // fields we want to add to session
  interface SessionData {
    userId: number
    email: string
    grant: GrantSession
  }
}
import grant, { GrantSession } from 'grant';
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
  'facebook': { // https://developers.facebook.com/apps/{key}/fb-login/settings/
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
// https://github.com/expressjs/session#secret should be random from env to avoid session hijacking`
// "Warning: connect.session() MemoryStore is not designed for a production environment, as it will leak memory, and will not scale past a single process." -> use https://github.com/kleydon/prisma-session-store
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
const ms_day = 1000*60*60*24;
const store = new PrismaSessionStore(db, {ttl: ms_day*14, checkPeriod: ms_day});
app.use(session({secret: 'track-time', saveUninitialized: true, resave: false, store})); // defaults: httpOnly
app.use(grant.express(auth_config));
import axios from 'axios';
import Twitter from 'twitter';
app.get('/signin', async (req, res) => {
  const provider = req.session.grant?.provider;
  console.log(req.session.grant);
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
const isAuthorized = (req: express.Request) => {
  // TODO check that user in query matches user from token, or somehow add user to queries on server?
  return true;
};
app.use('/db', (req, res, next) => {
  console.log('check auth for', req.method, req.originalUrl, inspect(req.body, { depth: null, colors: true })); // , req.session
  if (!req.session.userId || !req.session.email) return res.status(401).json({error: 'Not authenticated'});
  console.log('Authenticated as', req.session.email);
  if (!isAuthorized(req)) return res.status(403).json({error: 'Not authorized'});
  next();
});


// db endpoints
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
  '/dist/App.js': [
    { variable: 'user',
      query: (email: string) => db.user.findUnique({where: {email}}) },
  ],
  '/dist/Tasks.js': [
    { variable: 'dbTodos',
      query: (email: string) => db.todo.findMany({include, orderBy: todoOrderBy, where: {user: {email}}}) },
  ],
  '/dist/History.js': [
    { variable: 'dbTimes',
      query: (email: string) => db.time.findMany({...historyOpt, where: {todo: {user: {email}}}}) },
    { variable: 'dbTodoMutations',
      query: (email: string) => db.todoMutation.findMany({...historyOpt, where: {todo: {user: {email}}}}) },
  ],
};
const fillData = async (req: express.Request, js: string) => {
  const file = req.url.replace(/\?.*$/, ''); // strip query string of HMR requests which append ?mtime=...
  type file = keyof typeof replacements;
  // type r = typeof replacements[file][number]; // error on reduce below: none of those signatures are compatible with each other
  type r = { variable: string, query: (user: string) => Promise<any> }; // can't call reduce on incompatible Promise types
  if (file in replacements) { // file is not narrowed to file because of subtyping and lack of closed types
    const email = req.session.email;
    if (!email) return js;
    const rs: r[] = replacements[file as file]; // so we need to assert the type on both (rs up, file down)
    console.log('fillData', file, rs.map(x => x.variable));
    return await rs.reduce((a, r) => a.then(async s => s.replace(
      new RegExp(`const ${r.variable} = .+;`), // can't use variable in /regexp/
      `const ${r.variable} = ${JSON.stringify(await r.query(email))};`)), Promise.resolve(js));
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
  const { readFileSync } = await import('fs');
  const fileContents = Object.fromEntries(Object.keys(replacements).map(s => [s, readFileSync(`./build${s}`).toString()]));

  app.get(Object.keys(replacements), async (req, res) => {
    res.contentType('application/javascript');
    res.send(await fillData(req, fileContents[req.url]));
  });
  app.use(express.static('build'));
}

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
