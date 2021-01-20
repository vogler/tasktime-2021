/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    'frontend-static': {url: '/', static: true},
    frontend: {url: '/dist'},
    model: {url: '/dist'},
  },
  plugins: [
    '@snowpack/plugin-react-refresh',
    '@snowpack/plugin-typescript',
  ],
  packageOptions: {
    // source: 'remote', // npm deps from CDN instead of from node_modules
  }
};
