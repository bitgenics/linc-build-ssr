const path = require('path')
const webpack = require('webpack')
const ExtractCssChunks = require('extract-css-chunks-webpack-plugin')
const StatsPlugin = require('stats-webpack-plugin')

const PROFILE_DIR = path.resolve(__dirname, '..');
const PROJECT_DIR = process.cwd();

const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'));
const lincConfig = packageJson.linc || {};
const src = lincConfig.sourceDir || 'src';
const SRC_DIR = path.resolve(PROJECT_DIR, src);

const babel_options = {
  presets: [
    ['env', {
      "targets": {
        "browsers": ["> 1%", "last 2 versions"]
      }
    }],
    ['react'],
    ['stage-1']
  ],
  plugins: ["universal-import"],
  babelrc: false
}

module.exports = {
  name: 'client',
  target: 'web',
  devtool: 'source-map',
  entry: [
    'babel-polyfill',
    'fetch-everywhere',
    path.resolve(PROFILE_DIR, 'client.js')
  ],
  output: {
    filename: '_assets/js/[name].[chunkhash:8].js',
    chunkFilename: '_assets/js/[name].[chunkhash:8].chunk.js',
    path: path.resolve(PROJECT_DIR, 'dist', 'static'),
    publicPath: '/'
  },
  resolve: {
    alias: {
      'linc-config-js': path.resolve(SRC_DIR, 'linc.config.js')
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
        use: ExtractCssChunks.extract({
          use: {
            loader: 'css-loader',
            options: {
              modules: true,
              localIdentName: '[name]__[local]--[hash:base64:5]'
            }
          }
        })
      }
    ]
  },
  plugins: [
    new StatsPlugin('../lib/stats.json'),
    new ExtractCssChunks({
      filename: '_assets/css/[name].[chunkhash:8].css'
    }),
    new webpack.optimize.CommonsChunkPlugin({
      names: ['vendor'], // needed to put webpack bootstrap code before chunks
      filename: '_assets/js/[name].[chunkhash:8].js',
      minChunks: (module, count) => (
        typeof module.userRequest === 'string' &&
          module.userRequest.indexOf('/node_modules/') >= 0
      )
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
/*
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        screw_ie8: true,
        warnings: false
      },
      mangle: {
        screw_ie8: true
      },
      output: {
        screw_ie8: true,
        comments: false
      },
      sourceMap: true
    }),
*/
    new webpack.HashedModuleIdsPlugin(), // not needed for strategy to work (just good practice)
  ]
}
