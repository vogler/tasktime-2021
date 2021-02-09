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
  packageOptions: {
    // source: 'remote', // npm deps from CDN instead of from node_modules
  }
};
