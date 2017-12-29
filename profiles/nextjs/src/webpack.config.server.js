const path = require('path')
const webpack = require('webpack')

process.env.NODE_ENV = 'production'

const LINC_DIR = path.resolve(__dirname, '..')
const PROJECT_DIR = process.cwd()

const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'))
const lincConfig = packageJson.linc || {}
const src = lincConfig.sourceDir || 'src'
const SRC_DIR = path.resolve(PROJECT_DIR, src)

const babeloptions = {
  babelrc: false,
  presets: [
    [
      'babel-preset-env',
      {
        targets: {
          node: 8
        },
        modules: false
      }
    ],
    'babel-preset-stage-1'
  ],
  compact: true
}

const makeBabelAbsolute = babelOptions => {
  if (Array.isArray(babelOptions)) {
    babelOptions[0] = require.resolve(babelOptions[0])
    return babelOptions
  } else {
    return require.resolve(babelOptions)
  }
}

babeloptions.presets = babeloptions.presets.map(preset =>
  makeBabelAbsolute(preset)
)
if (babeloptions.plugins) {
  babeloptions.plugins = babeloptions.plugins.map(preset =>
    makeBabelAbsolute(preset)
  )
}

const createConfig = ({ targetDir = 'dist' } = {}) => {
  const TARGET_DIR = path.resolve(PROJECT_DIR, targetDir)
  return {
    entry: {
      'server-render': [path.resolve(LINC_DIR, 'dist', 'server-entry.js')]
    },
    target: 'node',
    resolve: {
      alias: {
        'next-build-info': path.join(TARGET_DIR, 'build_info.js')
      },
      extensions: ['.js', '.json', '.jsx'],
      modules: [
        SRC_DIR,
        'node_modules',
        path.resolve(PROJECT_DIR, 'node_modules')
      ]
    },
    resolveLoader: {
      modules: ['node_modules', path.resolve(LINC_DIR, 'node_modules')]
    },
    output: {
      path: path.join(TARGET_DIR, 'static'),
      filename: '../lib/[name].js',
      library: 'server',
      libraryTarget: 'commonjs2'
    },
    module: {
      rules: [
        {
          oneOf: [
            {
              include: /\.js|jsx$/,
              loader: 'babel-loader',
              exclude: /node_modules/,
              options: babeloptions
            },
            {
              include: /\.(css)$/,
              loader: 'ignore-loader'
            },
            {
              exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
              loader: 'file-loader',
              options: {
                name: '_assets/media/[name].[hash:8].[ext]'
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'window': undefined
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1
      })
    ]
  }
}

module.exports = createConfig
