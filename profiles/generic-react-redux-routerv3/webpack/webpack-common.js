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

const deps = Object.keys(packageJson.dependencies).concat(Object.keys(packageJson.devDependencies));

const babel_config = {
  test: /\.js$/,
  loader: 'babel-loader',
  exclude: /node_modules(?!\/linc-profile-generic-react-redux-routerv3\/render\.js$)/,
  options: {}
}

const makeBabelComponentAbsolute = (type, config) => {
  const name = Array.isArray(config) ? config[0] : config;
  const babel_name = name.indexOf('babel') === 0 ? name : `babel-${type}-${name}`;
  const p = path.resolve(PROJECT_DIR, 'node_modules', babel_name);
  if(Array.isArray(config)) {
    config[0] = p;
    return config
  } else {
    return p;
  }
}

try {
  const contents = fs.readFileSync(path.resolve(PROJECT_DIR, '.babelrc'));
  const config = JSON.parse(contents);
  config.presets = config.presets || [];
  config.plugins = config.plugins || [];
  config.presets = config.presets.map((elem) => makeBabelComponentAbsolute('preset', elem));
  config.plugins = config.plugins.map((elem) => makeBabelComponentAbsolute('plugin', elem));
  babel_config.options = config;
} catch (e) {
  //ignore
}

babel_config.options.presets = babel_config.options.presets || [];
babel_config.options.presets.push(path.resolve(LINC_DIR, 'node_modules', 'babel-preset-react-app'));

const env = lincConfig.build_env || {};
const defineEnv = {};
Object.keys(env).forEach((key) => defineEnv[key] = JSON.stringify(env[key]));
defineEnv['process.env.NODE_ENV'] = JSON.stringify('production');
const definePlugin = new webpack.DefinePlugin(defineEnv);

module.exports = {
  LINC_DIR, PROJECT_DIR, packageJson, lincConfig, srcDir, babel_config, deps, definePlugin
}
