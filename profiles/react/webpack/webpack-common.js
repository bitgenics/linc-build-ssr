const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

process.env.NODE_ENV = 'production';

const LINC_DIR = path.resolve(__dirname, '..');
const PROJECT_DIR = process.cwd();

const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'));
const lincConfig = packageJson.linc || {};
const src = lincConfig.sourceDir || 'src';
const srcDir = path.resolve(PROJECT_DIR, src);

const deps = Object.keys(packageJson.dependencies);
if (packageJson.devDependencies) {
  deps.concat(Object.keys(packageJson.devDependencies));
}


function ensureSlash(path, needsSlash) {
  var hasSlash = path.endsWith('/');
  if (hasSlash && !needsSlash) {
    return path.substr(path, path.length - 1);
  } else if (!hasSlash && needsSlash) {
    return path + '/';
  } else {
    return path;
  }
}

// We use "homepage" field to infer "public path" at which the app is served.
// Webpack needs to know it to put the right <script> hrefs into HTML even in
// single-page apps that may serve index.html for nested URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
var homepagePath = packageJson.homepage;
var homepagePathname = homepagePath ? url.parse(homepagePath).pathname : '/';
// Webpack uses `publicPath` to determine where the app is being served from.
// It requires a trailing slash, or the file assets will get an incorrect path.
var publicPath = ensureSlash(homepagePathname, true);
// `publicUrl` is just like `publicPath`, but we will provide it to our app
// as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
// Omit trailing slash as %PUBLIC_PATH%/xyz looks better than %PUBLIC_PATH%xyz.
var publicUrl = ensureSlash(homepagePathname, false);

const env = lincConfig.build_env || {};
const defineEnv = {};
Object.keys(env).forEach((key) => defineEnv[key] = JSON.stringify(env[key]));
defineEnv['process.env.NODE_ENV'] = JSON.stringify('production');
const definePlugin = new webpack.DefinePlugin(defineEnv);

module.exports = {
  LINC_DIR, PROJECT_DIR, packageJson, lincConfig, srcDir, deps, definePlugin, publicPath
}
