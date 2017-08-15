const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const common = require('./webpack-common.js');

const LINC_DIR = common.LINC_DIR;
const PROJECT_DIR = common.PROJECT_DIR;

const srcDir = common.srcDir;

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

const babel_options = {
  presets: [
    [path.resolve(LINC_DIR, 'node_modules', 'babel-preset-env'), {
      targets: {
        node: 4
      }
    }],
    [path.resolve(LINC_DIR, 'node_modules', 'babel-preset-react')],
    [path.resolve(LINC_DIR, 'node_modules', 'babel-preset-stage-1')]
  ]
}

const linc_exenv_path = path.resolve(LINC_DIR, 'node_modules', 'fake-exenv');
const prj_exenv_path = path.resolve(PROJECT_DIR, 'node_modules', 'fake-exenv');
const exenvPath = fs.existsSync(linc_exenv_path) ? linc_exenv_path : prj_exenv_path;

module.exports = {
  entry: {
    'server-render': [path.resolve(LINC_DIR, 'render.js')]
  },
  target: 'node',
  resolve: {
    alias: {
      'linc-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.config.js'),
      'linc-server-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.server.config.js'),
      'asset-manifest': path.resolve(PROJECT_DIR, 'dist', 'lib','asset-manifest.json'),
      'exenv': exenvPath
    },
    extensions: [".js", ".json", ".ts", ".tsx", ".png"],
    modules: [srcDir, "node_modules", path.resolve(PROJECT_DIR, "node_modules")],
  },

  output: {
    path: path.resolve(PROJECT_DIR, 'dist', 'static'),
    filename: '../lib/[name].js',
    library: 'server',
    libraryTarget: 'commonjs2'
  },

  module: {
    rules: [
      url_loader_config,
      {
        test: /\.svg$/,
        loader: 'svg-url-loader',
        query: {
          limit: 10000,
          name: '_assets/media/[name].[hash:8].[ext]'
        }
      },
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules(?!\/linc-profile-generic-react-redux-routerv3\/(render|client)\.js$)/,
        options: babel_options
      },
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
  externals: {
    'follow-redirects': 'follow-redirects',
    'faye-websocket': 'faye-websocket',
    'xmlhttprequest': 'xmlhttprequest'
  },

  plugins: [
    common.definePlugin,
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.ProvidePlugin({
      React: 'react',
    })
  ],

  stats: {
    children: false
  },

  // 'eval' | 'cheap-eval-source-map' | 'cheap-module-eval-source-map' | 'eval-source-map'
  devtool: 'source-map'
};

if(common.deps.includes('typescript')) {
  url_loader_config.exclude.push(/\.(ts|tsx)$/);
  module.exports.module.rules.push(
    { test: /\.tsx?$/,
      exclude: /node_modules/,
      use: [
        {
          loader: 'babel-loader',
          options: babel_options
        },
        {
          loader: 'awesome-typescript-loader'
        },
      ]
      
    })
}