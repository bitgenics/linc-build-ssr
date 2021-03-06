const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const common = require('./webpack-common.js');

const LINC_DIR = common.LINC_DIR;
const PROJECT_DIR = common.PROJECT_DIR;
const DIST_DIR = path.resolve(PROJECT_DIR, 'dist');
const LIB_DIR = path.resolve(DIST_DIR, 'lib');

const srcDir = common.srcDir;

const createConfig = (options) => {
  options = options || {}

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
      limit: 10,
      name: '_assets/media/[name].[hash:8].[ext]'
    }
  }

  const babel_options = options.babel || { presets: [], plugins: [] }
  babel_options.presets.push(
    ['env', {
      targets: {
        node: 8
      },
      modules: false
    }]
  )
  babel_options.presets.push('stage-1')

  const linc_exenv_path = path.resolve(LINC_DIR, 'node_modules', 'fake-exenv');
  const prj_exenv_path = path.resolve(PROJECT_DIR, 'node_modules', 'fake-exenv');
  const exenvPath = fs.existsSync(linc_exenv_path) ? linc_exenv_path : prj_exenv_path;

  const alias = {
    'linc-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.config.js'),
    'linc-server-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.server.config.js'),
    'asset-manifest': path.resolve(LIB_DIR,'asset-manifest.json'),
    'server-strategy': path.resolve(DIST_DIR,'server-strategy.js'),
    'includes': path.resolve(LIB_DIR, 'includes.js'),
    'exenv': exenvPath
  }
  Object.assign(alias, options.alias)

  let plugins = [
    common.definePlugin,
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.ProvidePlugin({
      React: 'react',
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ]
  plugins = plugins.concat(options.plugins.map((pluginOptions) => common.createPlugin(pluginOptions)))

  return {
    entry: {
      'server-render': [path.resolve(LINC_DIR, 'dist', 'render.js')]
    },
    target: 'node',
    resolve: {
      alias,
      extensions: [".js", ".json", ".jsx"],
      modules: [srcDir, "node_modules", path.resolve(PROJECT_DIR, "node_modules")],
    },
    resolveLoader: {
      modules: ['node_modules', path.resolve(LINC_DIR, 'node_modules')]
    },
    output: {
      path: path.resolve(PROJECT_DIR, 'dist', 'static'),
      filename: '../lib/[name].js',
      library: 'server',
      libraryTarget: 'commonjs2',
      publicPath: common.publicPath
    },

    module: {
      rules: [
        url_loader_config,
        {
          test: /\.svg$/,
          loader: 'svg-url-loader',
          query: {
            limit: 10,
            name: '_assets/media/[name].[hash:8].[ext]'
          }
        },
        { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
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
            name: '_assets/fonts/[name].[hash:8].[ext]'
          }
        }
      ]
    },
    externals: {
      'follow-redirects': 'follow-redirects',
      'faye-websocket': 'faye-websocket',
      'xmlhttprequest': 'xmlhttprequest'
    },

    plugins,

    stats: {
      children: false
    },

    // 'eval' | 'cheap-eval-source-map' | 'cheap-module-eval-source-map' | 'eval-source-map'
    devtool: 'source-map'
  };
}

module.exports = createConfig