# heroku has NODE_ENV=production which we check for in server.ts to skip the snowpack dev server and just serve the pre-build bundle.

# heroku installs but then removes devDependencies, so we need to run `heroku config:set NPM_CONFIG_PRODUCTION=false` to skip this, as described here: https://devcenter.heroku.com/articles/nodejs-support#skip-pruning

# The 512MB RAM of the free dyno is not enough for node's default 1.5GB heap, so we need to limit it:
# https://devcenter.heroku.com/articles/node-memory-use#tuning-the-garbage-collector

web: NODE_OPTIONS="--max_old_space_size=460" npm run build && node --optimize_for_size --loader ts-node/esm --es-module-specifier-resolution=node backend/server.ts
