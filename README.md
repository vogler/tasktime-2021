# track-time_snowpack-react-chakra-prisma

This is a test project building some todo/time-tracking app using:

- [Snowpack](https://www.snowpack.dev/) as a fast build tool (instead of webpack, Parcel)
- [React](https://reactjs.org/) for a reactive UI
- [chakra-ui](https://chakra-ui.com/) as UI component library
  - [react-icons](https://react-icons.github.io/react-icons)
  - maybe try [Formik](https://formik.org/) for forms
- [Prisma](https://www.prisma.io/) as ORM (instead of [TypeORM](https://github.com/typeorm/typeorm) which I had some issues [[1](https://github.com/typeorm/typeorm/issues/3238)] [[2](https://github.com/typeorm/typeorm/issues/4122)] with in https://github.com/vogler/syncmine)
  - sqlite as database

Tried Svelte and Firebase in an older iteration: https://github.com/vogler/track-time_svelte-firebase.
By now Svelte seems to officially support TypeScript: https://svelte.dev/blog/svelte-and-typescript.

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

### npm test

Launches the application test runner.
Run with the `--watch` flag (`npm test -- --watch`) to run in interactive watch mode.
