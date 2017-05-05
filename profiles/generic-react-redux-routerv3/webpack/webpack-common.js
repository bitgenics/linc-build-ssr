const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'production';

const LINC_DIR = path.resolve(__dirname, '..');
const PROJECT_DIR = process.cwd();

const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'));
const lincConfig = packageJson.linc || {};
const srcDir = lincConfig.sourceDir || 'src';

const deps = Object.keys(packageJson.dependencies).concat(Object.keys(packageJson.devDependencies));

const babel_config = {
  loader: {
    test: /\.js$/,
    loader: 'babel-loader',
    exclude: /node_modules(?!\/linc-profile-generic-react-redux-routerv3\/render\.js$)/,
    query: {}
  },
  query: {
    presets: {},
    plugins: {}
  }
}

try {
  const contents = fs.readFileSync(path.resolve(PROJECT_DIR, '.babelrc'));
  const config = JSON.parse(contents);
  if(config.presets) {
    config.presets.forEach((elem) => {if(elem.indexOf('react') < 0) babel_config.query.presets[elem] = ''});   
  }
  if(config.plugins) {
    config.plugins.forEach((elem) => {if(elem.indexOf('react') < 0) babel_config.query.plugins[elem] = ''});
  }
} catch (e) {
  //ignore
}

babel_config.loader.query.presets = Object.keys(babel_config.query.presets).map((elem) => path.resolve(PROJECT_DIR, 'node_modules', `babel-preset-${elem}`));
babel_config.loader.query.plugins = Object.keys(babel_config.query.plugins).map((elem) => path.resolve(PROJECT_DIR, 'node_modules', `babel-plugin-${elem}`));

babel_config.loader.query.presets.push(path.resolve(LINC_DIR, 'node_modules', `babel-preset-react-app`))

module.exports = {
  LINC_DIR, PROJECT_DIR, packageJson, lincConfig, srcDir, babel_config: babel_config.loader, deps
}
