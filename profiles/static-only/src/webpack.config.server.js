const path = require('path')
const webpack = require('webpack')

const LINC_DIR = path.resolve(__dirname, '..')
const PROJECT_DIR = process.cwd()

const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'))
const lincConfig = packageJson.linc || {}
const src = lincConfig.sourceDir || 'src'
const SRC_DIR = path.resolve(PROJECT_DIR, src)

const options = {
  mode: 'production',
  entry: {
    'server-render': [path.resolve(LINC_DIR, 'dist', 'server-entry.js')]
  },
  target: 'node',
  resolve: {
    alias: {
      'resolve-from': path.resolve(LINC_DIR, 'dist', 'fake-resolve-from.js'),
      'linc-server-config-js': path.resolve(SRC_DIR, 'linc.server.config.js'),
      'linc-statics': path.resolve(
        PROJECT_DIR,
        'dist',
        'tmp',
        '_linc_imports.js'
      )
    },
    modules: [
      SRC_DIR,
      'node_modules',
      path.resolve(PROJECT_DIR, 'node_modules')
    ]
  },
  resolveLoader: {
    modules: ['node_modules', path.resolve(LINC_DIR, 'node_modules')]
  },
  module: {
    rules: [
      {
        test: /\.marko$/,
        loader: 'marko-loader',
        options: {
          target: 'browser'
        }
      }
    ]
  },
  optimization: {
    minimize: false
  },
  output: {
    path: path.resolve(PROJECT_DIR, 'dist', 'static'),
    filename: '../lib/[name].js',
    library: 'server',
    libraryTarget: 'commonjs2'
  },
  plugins: [new webpack.DefinePlugin({ 'process.env': { BUNDLE: '"true"' } })]
}

module.exports = options
