const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const ManifestPlugin = require('webpack-manifest-plugin');
const workboxPlugin = require('workbox-webpack-plugin');
const common = require('./webpack-common.js');

const LINC_DIR = common.LINC_DIR;
const PROJECT_DIR = common.PROJECT_DIR;
const DIST_DIR = path.resolve(PROJECT_DIR, 'dist');

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

const extractPlugin = ExtractTextPlugin.extract({
  fallback: { loader: 'style-loader', options: { sourceMap: true } },
  use:[{ 
    loader: 'css-loader', 
    options: {
      sourceMap: true,
      modules: common.packageJson.linc.cssModules || false,
      importLoaders: 1,
      localIdentName: "[name]__[local]___[hash:base64:5]"
    }
  }]
})

const css_loader = {
  test: /\.(css)$/,
  loader: extractPlugin,
}

const babel_options = {
  presets: [
    ['env', {
      "targets": {
        "browsers": ["> 1%", "last 2 versions"]
      }
    }],
    ['react'],
    ['stage-1']
  ]
}

module.exports = {
  entry: {
    'main': [path.resolve(DIST_DIR, 'client.js')]
  },

  resolve: {
    alias: {
      'linc-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.config.js')
    },

    modules: [srcDir, "node_modules", path.resolve(PROJECT_DIR, "node_modules")],
    extensions: [".js", ".json", ".ts", ".tsx", ".png"]
  },
  resolveLoader: {
    modules: ['node_modules', path.resolve(LINC_DIR, 'node_modules')]
  },
  output: {
    // The build folder.
    path: path.resolve(DIST_DIR, 'static'),
    // Generated JS file names (with nested folders).
    // There will be one main bundle, and one file per asynchronous chunk.
    // We don't currently advertise code splitting but Webpack supports it.
    filename: '_assets/js/[name].[chunkhash:8].js',
    chunkFilename: '_assets/js/[name].[chunkhash:8].chunk.js',
    // We inferred the "public path" (such as / or /my-project) from homepage.
    publicPath: common.publicPath
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
        exclude: /node_modules/,
        options: babel_options
      },
      css_loader,
      {
        test: /\.(woff|woff2|eot|ttf)$/,
        loader: 'file-loader',
        options: {
          name: '_assets/fonts/[name].[hash:8].[ext]'
        }
      }
    ]
  },

  plugins: [
    common.definePlugin,
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: (module) => (
        // return true if module is from node_modules
        typeof module.userRequest === 'string' &&
        module.userRequest.indexOf('/node_modules/') >= 0
      )
    }),
    // extract css as text from js
    new ExtractTextPlugin({
      filename: '_assets/css/[name].[chunkhash:8].css'
    }),
    new ManifestPlugin({
      fileName: '../lib/asset-manifest.json'
    }),
    new webpack.ProvidePlugin({
      React: 'react',
    }),
    new workboxPlugin({
      globDirectory: path.resolve(DIST_DIR, 'static'),
      globPatterns: ['_assets/**/*.{html,js,css,png,svg}'],
      swDest: path.join(DIST_DIR, 'lib', 'includes', 'serviceworker.js'),
      dontCacheBustUrlsMatching: /\.\w{8}\./,
    }),
    new webpack.optimize.UglifyJsPlugin({
      beautify: false,
      sourceMap: true,
      mangle: {
        screw_ie8: true,
        keep_fnames: true
      },
      compress: {
        screw_ie8: true
      },
      comments: false
    })
  ],

  stats: {
    children: false,
  },

  // https://webpack.js.org/configuration/devtool/
  // 'eval' | 'cheap-eval-source-map' | 'cheap-module-eval-source-map' | 'eval-source-map'
  devtool: 'source-map'
};