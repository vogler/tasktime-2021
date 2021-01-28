# track-time_snowpack-react-chakra-prisma

This is a test project building some todo/time-tracking app using:

- [Snowpack](https://www.snowpack.dev/) as a fast build tool (instead of webpack, Parcel)
- [React](https://reactjs.org/) for a reactive UI
- [chakra-ui](https://chakra-ui.com/) as UI component library
  - [react-icons](https://react-icons.github.io/react-icons)
  - maybe try [Formik](https://formik.org/) for forms
- [Prisma](https://www.prisma.io/) as ORM (instead of [TypeORM](https://github.com/typeorm/typeorm) which I had some issues [[1](https://github.com/typeorm/typeorm/issues/3238)] [[2](https://github.com/typeorm/typeorm/issues/4122)] with in https://github.com/vogler/syncmine)
  - sqlite as database
  - would be nice to have values for the generated types to define custom functions: https://github.com/prisma/prisma/discussions/5291

Tried Svelte and Firebase in an older iteration: https://github.com/vogler/track-time_svelte-firebase.
By now Svelte seems to officially support TypeScript: https://svelte.dev/blog/svelte-and-typescript.

## Notes
### SSR
Maybe check out [Next.js](https://nextjs.org/) for easier SSR; example: https://github.com/prisma/prisma-examples/tree/latest/typescript/rest-nextjs-api-routes

### DRY: server+client API from schema
Seems strange that there is no framework/library that only requires the database schema and automatically provides an API on the server for it.
Also, no one seems to care about duplication. GraphQL just introduces more boilerplate for little benefit compared to just calling database functions on the client (can also select subset of fields to save data; authentication can be a middleware on the server, just need some access annotations for the schema).

- https://github.com/redwoodjs/redwood - only serverless, but need to manually setup a database server...
- https://github.com/blitz-js/blitz - looks better, but just generates the boilerplate on the server instead of avoiding it
- https://github.com/layrjs/layr - just MongoDB, too much boilerplate in models
- https://github.com/graphile/postgraphile - runs a GraphQL server that watches a PostgresSQL database; schema not as code, no generated code, no autocomplete? migrations?

### Typescript
FP in Typescript:
- https://github.com/gcanti/fp-ts
- https://github.com/gcanti/io-ts useful for Prisma abstraction? prob. would have to be used in the generated code.
- https://github.com/pfgray/ts-adt
- https://github.com/kimamula/ts-transformer-keys via https://github.com/cevek/ttypescript for runtime type information
- https://github.com/sindresorhus/type-fest

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
