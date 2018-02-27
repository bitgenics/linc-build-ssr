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
const CONFIG_FILENAME = 'src/linc.config.js'
const CONFIG_FILE = path.resolve(PROJECT_DIR, CONFIG_FILENAME)

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
    if (curr.imports) acc.imports.push(curr.imports)
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
  stdout.write(`${question} `)

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
    'Directory containing your source code:',
    'Please provide a valid directory.'
  )
  stdin.pause()
  return srcDir
}

/**
 * Get option value
 * @param option
 * @returns {Promise<*>}
 */
const getOptionValue = async option => {
  stdin.resume()
  const optionValue = await ask(
    `
${option.comment}, e.g., '${
      option.example ? option.example : option.default
    }':`,
    'This is a mandatory field. Please enter a value.'
  )
  stdin.pause()
  return optionValue
}

const getImport = async option => {
  stdin.resume()
  const importValue = await ask(
    `Please tell us where we can find '${option} by entering its path.
Path for ${option} (relative to your source dir):`,
    `This is a mandatory field. Please enter a value.`
  )
  stdin.pause()
  return importValue
}

const configLines = {
  top: [
    'const config = {',
    "    // polyfills: 'default,fetch,Symbol,Symbol.iterator,Array.prototype.find',",
    '    // requestExtendedUserInfo: true,'
  ],
  bottom: ['};', '', 'export default config']
}

const getOption = async (opt, memo, lvl) => {
  const indent = '    '.repeat(lvl + 1)
  const keys = Object.keys(opt)

  // Lookahead to see if we've reached the innermost level
  const o = opt[keys[0]]
  const ks = Object.keys(o)
  if (typeof o[ks[0]] === 'object') {
    // We can go a level deeper
    for (let k of keys) {
      memo.values = memo.values.concat(`${indent}${k}: {`)
      await getOption(opt[k], memo, lvl + 1)
      memo.values = memo.values.concat(`${indent}},`)
    }
  } else {
    let importSrc
    let isRequired = false
    // Yep, innermost level
    for (let k of keys) {
      let optn = opt[k]
      let s
      if (optn.required) {
        isRequired = true

        // Ask for the required option name
        let t = await getOptionValue(optn)
        s = `${indent}${k}: ${t}`

        // In case it's an object like <App/>
        t = t.replace(/^[^a-zA-Z0-9]*([a-zA-Z0-9]+)[^a-zA-Z0-9]*/, '$1')

        // Ask for the import path of the required option
        if (!importSrc) {
          importSrc = `import ${t} from '${await getImport(t)}'`
        }
      } else {
        if (optn.example) {
          s = `${indent}// ${k}: ${optn.example}`
        } else if (optn.default) {
          s = `${indent}// ${k}: ${optn.default}`
        }
      }
      if (s) {
        memo.values = memo.values.concat(`${s},`)
      }
    }
    memo.imports.push(importSrc)
    memo.required.push(isRequired)
  }
}

const createConfigFileContents = async all => {
  const memo = {
    imports: [],
    required: [],
    values: configLines.top
  }
  for (let x of all.values) {
    await getOption(x, memo, 0)
  }
  memo.values = memo.values.concat(configLines.bottom)

  // This creates a list of imports, where the imports for non-required
  // options are commented out.
  const imports = _.reduce(
    all.imports,
    (m, v, i) => {
      const imprt = memo.imports[i]
      if (imprt) {
        // We asked for it
        m.push(imprt)
      }
      // From example configuration
      v.forEach(o => {
        // Prevent duplicate lines
        if (imprt !== o) {
          m.push(memo.required[i] && !imprt ? o : `// ${o}`)
        }
      })
      return m
    },
    []
  )

  return [imports.join('\n'), '', memo.values.join('\n'), ''].join('\n')
}

const writeFile = (file, contents) =>
  new Promise((resolve, reject) => {
    return fs.writeFile(file, contents, err => {
      if (err) return reject(err)

      stdout.write(`**\n** Created new config file ${file}\n**\n`)
      return resolve()
    })
  })

const hasConfigFile = () => fs.existsSync(CONFIG_FILE)

const createConfigFile = async strategy => {
  // Don't do anything if config file exists
  if (!hasConfigFile()) {
    const all = getConfigFragments(strategy)
    const configFileContents = await createConfigFileContents(all)
    writeFile(CONFIG_FILE, configFileContents)
  }
}

const postBuild = async () => {
  const linc = packageJson.linc || {}
  if (!linc.sourceDir) {
    linc.sourceDir = await getSourceDir()
    await writePkg(packageJson)
  }
}

const useStateFromConfigFile = configFile => {
  if (configFile.indexOf('redux:') > 0) return 'redux-promise-counter'
  if (configFile.indexOf('state:') > 0) return 'config-promise-counter'

  return undefined
}

const askUseExternalApi = async () => {
  let useState = null

  stdin.resume()
  const useApi = await ask(
    `
Do you want to use external APIs while server-side rendering (y/n)?`,
    'Please answer y or n.'
  )
  if (useApi.toUpperCase() === 'Y') {
    const usePromiseCounter = await ask(
      `You can use redux-promise-counter, or provide your own function.
Do you want to use redux-promise-counter (y/n)?`,
      'Please answer y or n.'
    )
    useState =
      usePromiseCounter.toUpperCase() === 'Y'
        ? 'redux-promise-counter'
        : 'config-promise-counter'
  }
  stdin.pause()

  return useState
}

const getStrategy = async () => {
  let strategy
  let useState
  let configFile

  try {
    configFile = fs.readFileSync(CONFIG_FILE, 'utf-8')
    useState = useStateFromConfigFile(configFile)
    strategy = createStrategy(getDependencies(), useState)
  } catch (e) {
    useState = await askUseExternalApi()
    strategy = createStrategy(getDependencies(), useState)
    await createConfigFile(strategy)
  }

  return strategy
}

const build = async (opts, callback) => {
  if (!callback) {
    callback = opts
  } else {
    stdin = opts.stdin || stdin
    stdout = opts.stdout || stdout
  }

  const strategy = await getStrategy()
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
