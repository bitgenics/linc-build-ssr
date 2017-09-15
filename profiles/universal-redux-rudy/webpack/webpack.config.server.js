const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

const PROFILE_DIR = path.resolve(__dirname, '..');
const PROJECT_DIR = process.cwd();

const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'));
const lincConfig = packageJson.linc || {};
const src = lincConfig.sourceDir || 'src';
const SRC_DIR = path.resolve(PROJECT_DIR, src);

const babel_options = {
  presets: [
    ['env', {
      targets: {
        node: 8
      }
    }],
    ['react'],
    ['stage-1']
  ],
  plugins: ["universal-import"]
}

module.exports = {
  name: 'server-render',
  target: 'node',
  devtool: 'source-map',
  entry: [
    'babel-polyfill',
    path.resolve(PROFILE_DIR, 'server.js')
  ],
  output: {
    path: path.resolve(PROJECT_DIR, 'dist', 'lib'),
    filename: 'server-render.js',
    libraryTarget: 'commonjs2',
    publicPath: '/'
  },
  resolve: {
    alias: {
      'linc-config-js': path.resolve(SRC_DIR, 'linc.config.js'),
      'linc-server-config-js': path.resolve(SRC_DIR, 'linc.server.config.js'),
      'stats': path.resolve(PROJECT_DIR, 'dist', 'lib','stats.json'),
      'api': path.resolve(PROJECT_DIR, 'server', 'api.js')
    },

    modules: ["node_modules", path.resolve(PROJECT_DIR, "node_modules") ],
    extensions: ['.js', '.css']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules(?!\/linc-profile-universal-redux-rudy\/(server|client)\.js$)/,
        options: babel_options
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: {
          loader: 'css-loader/locals',
          options: {
            modules: true,
            localIdentName: '[name]__[local]--[hash:base64:5]'
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ]
}
