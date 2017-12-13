const path = require('path');
const fs = require('fs')
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const ManifestPlugin = require('webpack-manifest-plugin');
const workboxPlugin = require('workbox-webpack-plugin');
const common = require('./webpack-common.js');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const LINC_DIR = common.LINC_DIR;
const PROJECT_DIR = common.PROJECT_DIR;
const DIST_DIR = path.resolve(PROJECT_DIR, 'dist');

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

  const extractPlugin = ExtractTextPlugin.extract({
    fallback: { 
      loader: 'style-loader',
      options: { 
        sourceMap: true,
        hmr: false,
      }
    },
    use:[
      { 
        loader: 'css-loader', 
        options: {
          sourceMap: true,
          modules: common.packageJson.linc.cssModules || false,
          importLoaders: 1,
          minimize: true,
          localIdentName: "[name]__[local]___[hash:base64:5]"
        }
      },
      {
        loader: 'postcss-loader',
        options: {
          // Necessary for external CSS imports to work
          // https://github.com/facebookincubator/create-react-app/issues/2677
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            autoprefixer({
              browsers: [
                '>1%',
                'last 4 versions',
                'Firefox ESR',
                'not ie < 9', // React doesn't support IE8 anyway
              ],
              flexbox: 'no-2009',
            }),
          ],
        },
      },
    ]
  })

  const css_loader = {
    test: /\.(css)$/,
    loader: extractPlugin,
  }

  const babel_options = options.babel || { presets: [], plugins: [] }
  babel_options.presets.push(
    ['env', {
      "targets": {
        "browsers": ["> 1%", "last 2 versions"]
      },
      modules: false
    }]
  )
  babel_options.presets.push('stage-1')

  let plugins = [
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
    new webpack.optimize.CommonsChunkPlugin({
      name: ['vendor', 'manifest']
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
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: '../bundle-report.html',
      defaultSizes: 'gzip',
      openAnalyzer: false,
      generateStatsFile: false,
      statsFilename: '../webpack-stats.json',
      statsOptions: null,
      logLevel: 'error'
    })
  ]

  plugins = plugins.concat(options.plugins.map((pluginOptions) => common.createPlugin(pluginOptions)))

  const entry = {
    'main': [path.resolve(DIST_DIR, 'client.js')],
  }
  const deferFile = path.resolve(srcDir, 'defer.js')
  if(fs.existsSync(deferFile)) {
    entry.defer = [deferFile]
  }

  return {
    entry,

    resolve: {
      alias: {
        'linc-config-js': path.resolve(PROJECT_DIR, srcDir, 'linc.config.js')
      },

      modules: [srcDir, "node_modules", path.resolve(PROJECT_DIR, "node_modules")],
      extensions: [".js", ".json", ".jsx"]
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
    plugins,

    stats: {
      children: false,
    },

    // https://webpack.js.org/configuration/devtool/
    // 'eval' | 'cheap-eval-source-map' | 'cheap-module-eval-source-map' | 'eval-source-map'
    devtool: 'source-map'
  };
}

module.exports = createConfig 