# track-time_snowpack-react-chakra-prisma

Demo: https://vogler-track-time.herokuapp.com

This is a test project building some todo/time-tracking app using:

- [Snowpack](https://www.snowpack.dev/) as a fast build tool (instead of webpack, Parcel)
- [React](https://reactjs.org/) for a reactive UI
  - [Recoil](https://recoiljs.org/)
    - to avoid re-render of non-running timers (value-dependent dependency via `selectorFamily`)
    - to avoid re-mount of `InputForm` while adding a new item (decouple state from component tree)
- [chakra-ui](https://chakra-ui.com/) as UI component library
  - [react-icons](https://react-icons.github.io/react-icons)
  - maybe try [Formik](https://formik.org/) for forms
- [Prisma](https://www.prisma.io/) as ORM (instead of [TypeORM](https://github.com/typeorm/typeorm) which I had some issues [[1](https://github.com/typeorm/typeorm/issues/3238)] [[2](https://github.com/typeorm/typeorm/issues/4122)] with in https://github.com/vogler/syncmine)
  - PostgreSQL (or sqlite etc.) as database
  - would be nice to have values for the generated types to define custom functions: https://github.com/prisma/prisma/discussions/5291

Tried Svelte and Firebase in an older iteration: https://github.com/vogler/track-time_svelte-firebase.
By now Svelte seems to officially support TypeScript: https://svelte.dev/blog/svelte-and-typescript.

## Setup
Run `npm install`.
If you want to use sqlite instead of PostgreSQL, edit `backend/schema.prisma`.

- setup DB: `brew install postgresql && brew services start postgresql && createdb track-time`
- set `DATABASE_URL`, e.g. create `.env` file with `DATABASE_URL = 'postgresql://user@localhost:5432/track-time'`
- setup tables: `npm run db-push`

Use `npm run` to start the server with reload on changes and HMR via snowpack.
For production see heroku.com example in `Procfile`.

## Notes
### SSR
Maybe check out [Next.js](https://nextjs.org/) for easier SSR; example: https://github.com/prisma/prisma-examples/tree/latest/typescript/rest-nextjs-api-routes

### DRY: server+client API from schema
Seems strange that there is no framework/library that only requires the database schema and automatically provides an API on the server for it.
Also, no one seems to care about duplication. GraphQL just introduces more boilerplate for little benefit compared to just calling database functions on the client (can also select subset of fields to save data; authentication/authorization can be a middleware on the server, just need some access annotations for the schema).
Use row-level security in PostgreSQL for authorization and https://jwt.io to authenticate API requests as in [PostgREST's auth](https://postgrest.org/en/v7.0.0/auth.html)?

- https://github.com/redwoodjs/redwood - only serverless, but need to manually setup a database server...
- https://github.com/blitz-js/blitz - looks better, but just generates the boilerplate on the server instead of avoiding it
- https://github.com/layrjs/layr - just MongoDB, too much boilerplate in models
- https://www.prisma.io/docs/concepts/overview/prisma-in-your-stack/graphql - list of Prisma & GraphQL examples, all seem not DRY
- https://github.com/graphile/postgraphile - runs a GraphQL server that watches a PostgreSQL database; schema not as code, no generated code, no autocomplete? migrations?
- https://github.com/hasura/graphql-engine - GraphQL from PostgreSQL, realtime queries, too much boilerplate; haskell
- https://github.com/PostgREST/postgrest - REST API server from existing PostgreSQL database; haskell, no good [client-side lib](https://postgrest.org/en/v7.0.0/ecosystem.html#clientside-libraries) in Typescript, [postgrester](https://github.com/SocialGouv/postgrester) just uses SQL strings

Based on the generated code from Prisma, we define a generic server endpoint `/db/:model/:action` and a generic `db` object on the client that has Prisma's types but just relays the call to the server.

### Typescript
FP/types/meta:
- https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html
- https://github.com/gcanti/fp-ts
- https://github.com/gcanti/io-ts useful for Prisma abstraction? prob. would have to be used in the generated code.
- https://github.com/pfgray/ts-adt
- https://github.com/kimamula/ts-transformer-keys via https://github.com/cevek/ttypescript for runtime type information
- https://github.com/sindresorhus/type-fest
- https://github.com/piotrwitek/utility-types

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
