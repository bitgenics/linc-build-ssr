const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

process.env.NODE_ENV = 'production';
const LINC_DIR = path.resolve(__dirname, '..');
const PROJECT_DIR = process.cwd();

const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'));
const lincConfig = packageJson.linc || {};
const srcDir = lincConfig.sourceDir || 'src';

const url_loader_config = {
  exclude: [
    /\.html$/,
    /\.(js|jsx)$/,
    /\.css$/,
    /\.json$/,
    /\.svg$/,
    /\.woff$/,
    /\.woff2$/,
    /\.eot$/,
    /\.ttf$/,
  ],
  loader: 'url-loader',
  query: {
    limit: 10000,
    name: '_assets/media/[name].[hash:8].[ext]'
  }
}

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
  entry: {
    'server-render': [path.resolve(LINC_DIR, 'render.js')]
  },
  target: 'node',
  resolve: {
    alias: {
      'linc-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.config.js'),
      'linc-server-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.server.config.js'),
      'asset-manifest': path.resolve(PROJECT_DIR, 'dist', 'lib','asset-manifest.json')
    },
    extensions: [".js", ".json", ".ts", ".tsx"],
    modules: ["node_modules", path.resolve(PROJECT_DIR, "node_modules")],
  },

  output: {
    path: path.resolve(PROJECT_DIR, 'dist', 'static'),
    filename: '../lib/[name].js',
    library: 'server',
    libraryTarget: 'commonjs2'
  },

  module: {
    rules: [
      {
        exclude: [
          /\.html$/,
          /\.(js|jsx)$/,
          /\.css$/,
          /\.json$/,
          /\.svg$/,
          /\.woff$/,
          /\.woff2$/,
          /\.eot$/,
          /\.ttf$/,
        ],
        loader: 'url-loader',
        query: {
          limit: 10000,
          name: '_assets/media/[name].[hash:8].[ext]'
        }
      },
      {
        test: /\.svg$/,
        loader: 'svg-url-loader',
        query: {
          limit: 10000,
          name: '_assets/media/[name].[hash:8].[ext]'
        }
      },
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
      babel_config.loader,
      {
        include: /\.(css)$/,
        loader: 'ignore-loader'
      },
      {
        test: /\.(woff|woff2|eot|ttf)$/,
        loader: 'file-loader',
        options: {
          name: '_assets/fonts/[name].[ext]'
        }
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin(process.env),
    new webpack.optimize.OccurrenceOrderPlugin()
  ],

  stats: {
    children: false
  },

  // 'eval' | 'cheap-eval-source-map' | 'cheap-module-eval-source-map' | 'eval-source-map'
  devtool: 'source-map'
};

const deps = Object.keys(packageJson.dependencies).concat(Object.keys(packageJson.devDependencies));
if(deps.includes('typescript')) {
  url_loader_config.exclude.push(/\.(ts|tsx)$/);
  module.exports.module.rules.push({ test: /\.tsx?$/, loader: "awesome-typescript-loader" })
}