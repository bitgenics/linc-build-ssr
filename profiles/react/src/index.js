const path = require('path')
const webpack = require('webpack')
const fse = require('fs-extra')

const server_config = require('../webpack/webpack.config.server.js')
const client_config = require('../webpack/webpack.config.client.js')
const createStrategy = require('./strategy')
const generateServerStrategy = require('./generateServerStrategy')
const generateClient = require('./generateClient')
const generateIncludes = require('./generateIncludes')

const PROJECT_DIR = process.cwd()
const DIST_DIR = path.resolve(PROJECT_DIR, 'dist')
const MODULES_DIR = path.resolve(PROJECT_DIR, 'node_modules')
const LIB_DIR = path.resolve(DIST_DIR, 'lib')
const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'))

const mapValues = (obj, iterator) => {
  const keys = Object.keys(obj)
  const mapped = {}
  keys.forEach(key => {
    mapped[key] = iterator(obj[key], key, obj)
  })
  return mapped
}

const getDependencies = () => {
  const nodeModuleDir = path.resolve(PROJECT_DIR, 'node_modules')
  const deps = Object.assign(
    {},
    packageJson.dependencies,
    packageJson.devDependencies
  )
  return mapValues(deps, (_, name) => {
    const pjf = path.resolve(nodeModuleDir, name, 'package.json')
    const pj = require(pjf)
    return pj.version
  })
}

const runWebpack = (config, options) => {
  return new Promise((resolve, reject) => {
    config = config(options)
    webpack(config, (err, stats) => {
      if (err) return reject(err)
      const errors = stats.toJson('errors-only').errors.toString()
      if (errors) return reject(errors)
      resolve()
    })
  })
}

const copyStatic = async () => {
  const src = packageJson.linc && packageJson.linc.staticDir
  if (src) {
    const dirname = path.basename(src)
    const dest = path.resolve(DIST_DIR, 'static', dirname)
    console.log(`Copying ${src} to ${dest}`)
    return fse.copy(src, dest, {
      overwrite: true,
      dereference: true,
      preserveTimestamps: true
    })
  }
}

const makeBabelAbsolute = babelOptions => {
  if (Array.isArray(babelOptions)) {
    babelOptions[0] = path.resolve(MODULES_DIR, babelOptions[0])
    return babelOptions
  } else {
    return path.resolve(MODULES_DIR, babelOptions)
  }
}

const mergeOptions = (acc, curr) => {
  acc.alias = Object.assign({}, acc.alias, curr.alias)
  if (curr.babel && curr.babel.presets) {
    const presets = curr.babel.presets.map(makeBabelAbsolute)
    acc.babel.presets = acc.babel.presets.concat(presets)
  }
  if (curr.babel && curr.babel.plugins) {
    const plugins = curr.babel.plugins.map(makeBabelAbsolute)
    acc.babel.plugins = acc.babel.plugins.concat(plugins)
  }
  if (Array.isArray(curr.plugins)) {
    acc.plugins = acc.plugins.concat(curr.plugins)
  } else if (curr.plugins) {
    acc.plugins.push(curr.plugins)
  }
  return acc
}

const getWebpackOptions = (strategy, env) => {
  const all = strategy.libs
    .map(lib => {
      try {
        return require(`./libs/config_client/${lib}`).webpackConfig
      } catch (e) {}
    })
    .filter(e => e)
  const empty = { alias: {}, babel: { presets: [], plugins: [] }, plugins: [] }
  const options = all.map(e => e(DIST_DIR)[env]).reduce(mergeOptions, empty)
  return options
}

const build = async callback => {
  const strategy = createStrategy(getDependencies())
  await generateClient(path.resolve(DIST_DIR, 'client.js'), strategy)
  const serverStrategy = generateServerStrategy(
    path.resolve(DIST_DIR, 'server-strategy.js'),
    strategy
  )
  console.log('Creating a client package. This can take a minute or two..')
  const staticCopy = copyStatic()
  await runWebpack(client_config, getWebpackOptions(strategy, 'client'))
  console.log('Created client package')

  await generateIncludes(
    path.resolve(LIB_DIR, 'includes.js'),
    path.resolve(LIB_DIR, 'includes')
  )

  console.log('Now working on server package')
  await serverStrategy
  await runWebpack(server_config, getWebpackOptions(strategy, 'server'))
  await staticCopy
  console.log('Created server package')

  console.log('We have created an overview of your bundles in dist/bundle-report.html')

  callback()
}

module.exports = build
