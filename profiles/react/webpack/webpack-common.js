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

const env = lincConfig.build_env || {};
const defineEnv = {};
Object.keys(env).forEach((key) => defineEnv[key] = JSON.stringify(env[key]));
defineEnv['process.env.NODE_ENV'] = JSON.stringify('production');
const definePlugin = new webpack.DefinePlugin(defineEnv);

module.exports = {
  LINC_DIR, PROJECT_DIR, packageJson, lincConfig, srcDir, deps, definePlugin
}
