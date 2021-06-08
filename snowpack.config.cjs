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
    bundle: true,
    // minify: true, // we want to replace variables on the server
    target: 'es2018', // es2020 is the highest, but also replaces const with var :(
  },
  buildOptions: {
    // heroku fails removing old build files: 'rimrafSafe(): /tmp/build_3e0293ce/node_modules/@emotion/memoize/dist/emotion-memoize.browser.cjs.js outside of buildOptions.out /tmp/build_3e0293ce/build'
    // https://www.snowpack.dev/reference/configuration#buildoptions.clean
    // clean: false, // does not help
    out: './build', // default 'build'
  },
  packageOptions: {
    // source: 'remote', // npm deps from CDN instead of from node_modules
  }
};
