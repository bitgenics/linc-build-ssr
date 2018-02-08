const _ = require('underscore')
const path = require('path')
const webpack = require('webpack')
const fs = require('fs-extra')
const writePkg = require('write-pkg')

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

let stdin = process.stdin
let stdout = process.stdout

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
    return fs.copy(src, dest, {
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

const getConfigFragments = strategy => {
  const all = strategy.libs
    .map(lib => {
      try {
        return require(`./libs/config_client/${lib}`).configFragment
      } catch (e) {}
    })
    .filter(e => !!e)

  const empty = { imports: [], values: [] }
  return all.reduce((acc, curr) => {
    if (curr.imports) acc.imports = acc.imports.concat(curr.imports)
    if (curr.values) acc.values = acc.values.concat(curr.values)
    return acc
  }, empty)
}

const getWebpackOptions = (strategy, env) => {
  const all = strategy.libs
    .map(lib => {
      try {
        return require(`./libs/config_client/${lib}`).webpackConfig
      } catch (e) {}
    })
    .filter(e => !!e)

  const empty = { alias: {}, babel: { presets: [], plugins: [] }, plugins: [] }
  const options = all.map(e => e(DIST_DIR)[env]).reduce(mergeOptions, empty)
  return options
}

const readOnce = () =>
  new Promise(resolve => {
    stdin.once('data', resolve)
  })

const ask = async (question, suggestion) => {
  stdout.write(`${question}: `)

  let answer = await readOnce()
  if (answer) {
    answer = answer.toString().trim()
    if (answer.length > 0) {
      return answer
    }
  }
  stdout.write(`${suggestion}\n`)
  return ask(question, suggestion)
}

const getSourceDir = async () => {
  stdin.resume()
  const srcDir = await ask(
    'Directory containing your source code',
    'Please provide a valid directory.'
  )
  stdin.pause()
  return srcDir
}

/**
 * Get option value
 * @param question
 * @returns {Promise<*>}
 */
const getOptionValue = async question => {
  stdin.resume()
  const optionValue = await ask(
    question,
    'This is a mandatory field. Please enter a value.'
  )
  stdin.pause()
  return optionValue
}

const notLast = (ar, x) => ar.indexOf(x) < ar.length - 1

const configLines = {
  top: [
    'const config = {',
    "\t// polyfills: 'default,fetch,Symbol,Symbol.iterator,Array.prototype.find',",
    '\t// requestExtendedUserInfo: true,'
  ],
  bottom: ['};', '', 'export default config']
}

const createConfigFileContents = async all => {
  const imports = all.imports.join('\n')
  let values = configLines.top

  const configOptions = all.values
  for (let x of configOptions) {
    for (let y of Object.keys(x)) {
      values = values.concat(`\t${y}: {`)

      // Suboptions
      const subOptionKeys = Object.keys(x[y])
      for (let z of subOptionKeys) {
        const opt = x[y][z]

        let optionValue
        if (opt.required) {
          optionValue = await getOptionValue(opt.comment)
        }

        let s
        const c = opt.commented ? '// ' : ''
        if (optionValue) {
          s = `\t\t${c}${z}: ${optionValue}`
        } else if (opt.example) {
          s = `\t\t${c}${z}: ${opt.example}`
        } else if (opt.default) {
          s = `\t\t${c}${z}: ${opt.default}`
        }
        if (s) {
          values = values.concat(notLast(subOptionKeys, z) ? s + ',' : s)
        }
      }
      const t = '\t}'
      values = values.concat(notLast(configOptions, x) ? t + ',' : t)
    }
  }

  values = values.concat(configLines.bottom)
  return [imports, '', values.join('\n'), ''].join('\n')
}

const writeFile = (file, contents) =>
  new Promise((resolve, reject) => {
    return fs.writeFile(file, contents, err => {
      if (err) return reject(err)

      stdout.write(`**\n** Created new config file ${file}\n**\n`)
      return resolve()
    })
  })

const createConfigFile = async strategy => {
  const CONFIG_FILENAME = 'src/linc.config.js'
  const configFile = path.join(process.cwd(), CONFIG_FILENAME)

  // Don't do anything if config file exists
  if (fs.existsSync(configFile)) return resolve()

  const all = getConfigFragments(strategy)
  const contents = await createConfigFileContents(all)
  writeFile(configFile, contents)
}

const postBuild = async () => {
  const linc = packageJson.linc || {}
  if (!linc.sourceDir) {
    linc.sourceDir = await getSourceDir()
    await writePkg(packageJson)
  }
}

const build = async (opts, callback) => {
  if (!callback) {
    callback = opts
  } else {
    stdin = opts.stdin || stdin
    stdout = opts.stdout || stdout
  }

  const strategy = createStrategy(getDependencies())
  await createConfigFile(strategy)
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

  console.log('Running post build operations')
  await postBuild()

  console.log(
    'We have created an overview of your bundles in dist/bundle-report.html'
  )

  callback()
}

module.exports = build
