/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    'frontend-static': {url: '/', static: true},
    frontend: {url: '/dist'},
    shared: {url: '/dist'},
  },
  plugins: [
    '@snowpack/plugin-react-refresh',
    '@snowpack/plugin-typescript',
    // '@snowpack/plugin-webpack', // bundles and minifies js -> hard to replace initialTodos. TODO put in index.html?
  ],
  optimize: { // uses esbuild, https://www.snowpack.dev/guides/optimize-and-bundle
    bundle: false, // deactivated for now, see https://github.com/snowpackjs/snowpack/issues/3403
    // since node 15.14.0 (no problem with 15.0.1) fails removing old build files: 'rimrafSafe(): /tmp/build_3e0293ce/node_modules/@emotion/memoize/dist/emotion-memoize.browser.cjs.js outside of buildOptions.out /tmp/build_3e0293ce/build'
    // tried buildOptions.clean: false, and buildOptions.out: '/tmp/snowpack' which did not help (server.ts reads from ./build; fails on macOS because it changes to /private/tmp)

    // minify: true, // we want to replace variables on the server
    target: 'es2018', // es2020 is the highest, but also replaces const with var :(
  },
  packageOptions: {
    // source: 'remote', // npm deps from CDN instead of from node_modules
  }
};
