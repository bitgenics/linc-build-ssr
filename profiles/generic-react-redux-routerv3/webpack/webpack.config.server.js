const path = require('path');
const webpack = require('webpack');

process.env.NODE_ENV = 'production';

const packageJson = require(path.resolve(process.cwd(), 'package.json'));
const lincConfig = packageJson.linc || {};
const srcDir = lincConfig.src || 'src';

module.exports = {
  entry: {
    'server-render': [path.resolve(__dirname, '../render.js')]
  },
  target: 'node',
  resolve: {
    alias: {
      'linc-config-js': path.resolve(process.cwd(), srcDir, 'linc.config.js'),
      'linc-server-config-js': path.resolve(process.cwd(), srcDir, 'linc.server.config.js'),
      'asset-manifest': path.resolve(process.cwd(), 'dist', 'lib','asset-manifest.json')
    },
    extensions: [".js", ".json", ".ts", ".tsx"],
    modules: ["node_modules", path.resolve(process.cwd(), "node_modules")],
  },

  output: {
    path: path.resolve(process.cwd(), 'dist', 'static'),
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
          /\.less$/,
          /\.json$/,
          /\.svg$/,
          /\.woff$/,
          /\.woff2$/,
          /\.eot$/,
          /\.ttf$/,
          /\.(ts|tsx)$/
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
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules(?!\/linc-profile-generic-react-redux-routerv3\/render\.js$)/,
        query: {
          presets: ['react-app']
        }
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