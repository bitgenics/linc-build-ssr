const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const ManifestPlugin = require('webpack-manifest-plugin');

process.env.NODE_ENV = 'production';

function ensureSlash(path, needsSlash) {
  var hasSlash = path.endsWith('/');
  if (hasSlash && !needsSlash) {
    return path.substr(path, path.length - 1);
  } else if (!hasSlash && needsSlash) {
    return path + '/';
  } else {
    return path;
  }
}

const packageJson = require(path.resolve(process.cwd(), 'package.json'));
const lincConfig = packageJson.linc || {};
const srcDir = lincConfig.src || 'src';

// We use "homepage" field to infer "public path" at which the app is served.
// Webpack needs to know it to put the right <script> hrefs into HTML even in
// single-page apps that may serve index.html for nested URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
var homepagePath = packageJson.homepage;
var homepagePathname = homepagePath ? url.parse(homepagePath).pathname : '/';
// Webpack uses `publicPath` to determine where the app is being served from.
// It requires a trailing slash, or the file assets will get an incorrect path.
var publicPath = ensureSlash(homepagePathname, true);
// `publicUrl` is just like `publicPath`, but we will provide it to our app
// as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
// Omit trailing slash as %PUBLIC_PATH%/xyz looks better than %PUBLIC_PATH%xyz.
var publicUrl = ensureSlash(homepagePathname, false);

module.exports = {
  entry: {
    'main': [path.resolve(__dirname, '../client.js')]
  },

  resolve: {
    alias: {
      'linc-config-js': path.resolve(process.cwd(), srcDir, 'linc.config.js')
    },

    modules: ["node_modules", path.resolve(process.cwd(), "node_modules")],
    extensions: [".js", ".json", ".ts", ".tsx"]
  },
  output: {
    // The build folder.
    path: path.resolve(process.cwd(), 'dist', 'static'),
    // Generated JS file names (with nested folders).
    // There will be one main bundle, and one file per asynchronous chunk.
    // We don't currently advertise code splitting but Webpack supports it.
    filename: '_assets/js/[name].[chunkhash:8].js',
    chunkFilename: '_assets/js/[name].[chunkhash:8].chunk.js',
    // We inferred the "public path" (such as / or /my-project) from homepage.
    publicPath: publicPath
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
        exclude: /node_modules(?!\/linc-profile-generic-react-redux-routerv3\/client\.js$)/,
        query: {
          presets: ['react-app']
        }
      },
      {
        test: /\.(css)$/,
        loader: ExtractTextPlugin.extract({
          fallback: { loader: 'style-loader', options: { sourceMap: true } },
          use:[
                { 
                  loader: 'css-loader', 
                  options: { sourceMap: true }
                }
              ]
        })
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
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
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
    new webpack.optimize.UglifyJsPlugin({
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
