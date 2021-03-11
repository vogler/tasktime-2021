# track-time_snowpack-react-chakra-prisma

Demo: https://vogler-track-time.herokuapp.com

This is a test project building some todo/time-tracking app using:

- [Snowpack](https://www.snowpack.dev/) as a fast build tool (instead of webpack, Parcel)
- [React](https://reactjs.org/) for a reactive UI
  - [Recoil](https://recoiljs.org/)
    - to avoid re-render of non-running timers (value-dependent dependency via `selectorFamily`)
    - to avoid re-mount of `InputForm` while adding a new item (decouple state from component tree)
  - [react-router](https://reactrouter.com/web) for routing in the browser (routes are redirected to / by the server)
- [chakra-ui](https://chakra-ui.com/) as UI component library
  - [react-icons](https://react-icons.github.io/react-icons)
  - maybe try [Formik](https://formik.org/) for forms
- [Prisma](https://www.prisma.io/) as ORM (instead of [TypeORM](https://github.com/typeorm/typeorm) which I had some issues [[1](https://github.com/typeorm/typeorm/issues/3238)] [[2](https://github.com/typeorm/typeorm/issues/4122)] with in https://github.com/vogler/syncmine)
  - PostgreSQL (or sqlite etc.) as database
  - missing some values/types, no trees, see notes below
- [grant](https://github.com/simov/grant) for OAuth with google; requires little code, dynamic json config. Discarded alternatives:
  - [auth0](https://auth0.com/) free plan has 7k users and 2 social connections; their React example uses hook, so page first loads, then checks auth and then loads rest -> too many round trips (same as with firebase)
  - [passport](https://github.com/jaredhanson/passport) has passport-local for username+password and normalized profile information, but requires way too much code

Tried Svelte and Firebase in an older iteration: https://github.com/vogler/track-time_svelte-firebase.
By now Svelte seems to officially support TypeScript: https://svelte.dev/blog/svelte-and-typescript.

## Setup
Run `npm install`.
If you want to use sqlite instead of PostgreSQL, edit `backend/schema.prisma`.

- setup DB: `brew install postgresql && brew services start postgresql && createdb track-time`
- set `DATABASE_URL`, e.g. create `.env` file with `DATABASE_URL = 'postgresql://user@localhost:5432/track-time'`
- setup tables: `npm run db-push`

Use `npm start` to start the server with reload on changes and HMR via snowpack.
For production see heroku.com example in `Procfile`.

## Notes
### SSR
Maybe check out [Next.js](https://nextjs.org/) for easier SSR; example: https://github.com/prisma/prisma-examples/tree/latest/typescript/rest-nextjs-api-routes

### DRY: server+client API from schema
Seems strange that there is no framework/library that only requires the database schema and automatically provides an API on the server for it.
Also, no one seems to care about duplication. GraphQL just introduces more boilerplate for little benefit compared to just calling database functions on the client (can also select subset of fields to save data; authentication/authorization can be a middleware on the server, just need some access annotations for the schema).
Use [row-level security in PostgreSQL](https://www.postgresql.org/docs/13/ddl-rowsecurity.html) for authorization and https://jwt.io to authenticate API requests as in [PostgREST's auth](https://postgrest.org/en/v7.0.0/auth.html)? Would need to `CREATE ROLE` for every user?

Was not happy with
- https://github.com/redwoodjs/redwood - only serverless, but need to manually setup a database server...
- https://github.com/blitz-js/blitz - looks better, but just generates the boilerplate on the server instead of avoiding it
- https://github.com/layrjs/layr - just MongoDB, too much boilerplate in models
- https://www.prisma.io/docs/concepts/overview/prisma-in-your-stack/graphql - list of Prisma & GraphQL examples, all seem not DRY
- https://github.com/graphile/postgraphile - runs a GraphQL server that watches a PostgreSQL database; schema not as code, no generated code, no autocomplete? migrations?
- https://github.com/hasura/graphql-engine - GraphQL from PostgreSQL, realtime queries, too much boilerplate; haskell
- https://github.com/PostgREST/postgrest - REST API server from existing PostgreSQL database; haskell, no good [client-side lib](https://postgrest.org/en/v7.0.0/ecosystem.html#clientside-libraries) in Typescript, [postgrester](https://github.com/SocialGouv/postgrester) just uses SQL strings

Based on the generated code from Prisma, we define a generic server endpoint `/db/:model/:action` and a generic `db` object on the client that has Prisma's types but just relays the call to the server.

### Prisma
- Would be nice to have values for the generated types to define custom functions: https://github.com/prisma/prisma/discussions/5291
  - Use the following? https://github.com/valentinpalkovic/prisma-json-schema-generator
- No good way to get the union of several models/tables. See comments in `History.tsx`: we currently fetch all entries and then merge sort them on the client.
  - [Support for a Union type #2505](https://github.com/prisma/prisma/issues/2505)
  - [Option brand the model name into data #5315](https://github.com/prisma/prisma/issues/5315)
  - implemented basic `db_union` with raw query, but is still missing `include` which we use, summary: https://github.com/prisma/prisma/issues/2505#issuecomment-785283427
- Does not support trees yet ([TypeORM does](https://typeorm.io/#/tree-entities)):
  - [Tree structures support #4562](https://github.com/prisma/prisma/issues/4562)
  - [Support recursive relationships #3725](https://github.com/prisma/prisma/issues/3725)
    - recursive query (with [queryRaw](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)) to get transitive hull of first select:
      ~~~sql
      with recursive subtodos as (select * from "Todo" where id=64 union select p.* from "Todo" p inner join subtodos s on s.id = p."parentId") select * from subtodos;`
      ~~~
  - raw query, native PostgreSQL type:
    - https://www.cybertec-postgresql.com/en/postgresql-speeding-up-recursive-queries-and-hierarchic-data/
      - https://www.cybertec-postgresql.com/en/postgresql-ltree-vs-with-recursive/
      - https://www.postgresql.org/docs/current/ltree.html

### Typescript
FP/types/meta:
- https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html
- https://github.com/gcanti/fp-ts
- https://github.com/gcanti/io-ts useful for Prisma abstraction? prob. would have to be used in the generated code.
- https://github.com/gcanti/monocle-ts Lens, Prism, Traversal...
- https://github.com/pfgray/ts-adt
- https://github.com/kimamula/ts-transformer-keys via https://github.com/cevek/ttypescript for runtime type information
- https://github.com/sindresorhus/type-fest
- https://github.com/piotrwitek/utility-types

### Performance
Before adding auth, Chrome Dev Tools' network tab said ~300ms/350ms for DOM/Load in incognito mode with `npm start` (snowpack dev), and ~600ms in normal mode.

Noticed that the longer time was due to extensions (Surfingkeys, React dev tools, others?) -> only measure in incognito mode.

After adding auth, not logged in, at 350ms/360ms. Can see in waterfall that it's due to pending websocket request to hmr-client.js -- strange that affects load time despite staying open forever.

With `npm run start-prod` at 200ms/206ms (no bundler yet) -> no more hmr-client.

Seems like favicon.ico (and manifest.webmanifest only when not in incognito) are loaded after load is done.
However, last request is started at 120ms and done in 8ms, but then there's nothing in the waterfall and result is 208ms/213ms -> not changed by removing favicon.ico/manifest.webmanifest.

https://web.dev/measure for https://vogler-track-time.herokuapp.com performance 40, accessibility 85, best practices 100, SEO 100.

~~~
First Contentful Paint 5.2 s, Time to Interactive 8.8 s, Speed Index 10.1 s
Estimated Savings: Enable text compression: 4.2 s (@chakra-ui/react.js 555.9 KB / 731.4 KB), Remove unused JavaScript 3.6 s, Use HTTP/2 2.91 s, Minify JavaScript 1.95 s
~~~

Load time >= with [compression](https://github.com/expressjs/compression). Probably because it re-compresses every time.
With [shrink-ray](https://github.com/Alorel/shrink-ray) 791 kB -> 740 kB transferred (both 460 kB with cache).
Did not compile on heroku when installing via ssh, but then worked on automatic deploy. Encoding is br for bigger files.

Bundlers: bundle, but don't minify for now since we replace variables on the server. Values from dev tools with 'disable cache'.
First row is not logged in, second is logged in.

| bundle            | transferred      | resources        | finish           | DOMContentLoaded | Load             |
|-------------------|------------------|------------------|------------------|------------------|------------------|
| none<br>dev       | 861 kB<br>940 kB | 4.1 MB<br>4.7 MB | 190 ms<br>1.60 s | 351 ms<br>1.25 s | 366 ms<br>1.61 s |
| none<br>build     | 250 kB<br>287 kB | 1.1 MB<br>1.3 MB | 126 ms<br>327 ms | 201 ms<br>275 ms | 206 ms<br>334 ms |
| esbuild<br>es2018 | 208 kB<br>213 kB | 1.1 MB<br>1.1 MB | 59 ms<br>279 ms  | 183 ms<br>258 ms | 196 ms<br>366 ms |
| webpack           |                  |                  |                  |                  |                  |

https://web.dev/measure with esbuild es2018:
~~~
First Contentful Paint 2.2 s, Time to Interactive 2.7 s, Speed Index 4.2 s
Estimated Savings: Remove unused JavaScript: 0.75 s, Reduce initial server response time: 0.7 s, Minify JavaScript: 0.3 s
~~~

---

> ✨ Bootstrapped with Create Snowpack App (CSA).

~~~
npx create-snowpack-app track-time_snowpack-react-chakra-prisma --template @snowpack/app-template-react-typescript
~~~

## Available Scripts

### npm start

Runs the app in the development mode.
Open http://localhost:8080 to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

### npm run build

Builds a static copy of your site to the `build/` folder.
Your app is ready to be deployed!

**For the best production performance:** Add a build bundler plugin like "@snowpack/plugin-webpack" to your `snowpack.config.js` config file.
