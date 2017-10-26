const path = require('path')
const fse = require('fs-extra')

const steps = [
  'getStatePromise',
  'router',
  'wrapInStoreHoC',
  'render',
  'afterRender'
]

const mapValues = (obj, iterator) => {
  const keys = Object.keys(obj)
  const mapped = {}
  keys.forEach(key => {
    mapped[key] = iterator(obj[key], key, obj)
  })
  return mapped
}

const getModules = strategy => {
  let modules = []
  steps.forEach(step => {
    const module = strategy[step]
    if (Array.isArray(module)) {
      modules = modules.concat(module)
    } else {
      modules.push(module)
    }
  })

  return modules
}

const getImports = modules => {
  const fragments = modules.map(
    module => (module ? module.clientImportFragment : '')
  )
  return fragments.join('\n')
}

const requireLib = module => {
  const file = path.resolve(__dirname, 'libs', 'config_client', module)
  try {
    return require(file)
  } catch (e) {
    return undefined
  }
}

const createClientStrategy = strategy => {
  const clientStrategy = {}
  steps.forEach(step => {
    const module = strategy[step]
    if (typeof module === 'string') {
      clientStrategy[step] = requireLib(module)
    } else if (Array.isArray(module)) {
      clientStrategy[step] = module.reduce((libs, name) => {
        const lib = requireLib(name)
        if (lib) {
          libs.push(lib)
        }
        return libs
      }, [])
    }
  })
  return clientStrategy
}

const createClientCode = strategy => {
  const clientStrategy = createClientStrategy(strategy)
  const modules = getModules(clientStrategy)

  let wrapHoc
  if (clientStrategy.wrapInStoreHoC) {
    wrapHoc = clientStrategy.wrapInStoreHoC.wrapInStoreHoCFragment(
      'renderComponent',
      'store',
      'routeComponent'
    )
  } else {
    wrapHoc = 'const renderComponent = routeComponent\n'
  }

  return `${getImports(modules)}

import createConfig from 'linc-config-js'

const config = typeof createConfig === 'function' ? createConfig('CLIENT') : createConfig;

const serverState = (window && window.__INITIALSTATE__);
const initialState = config.state && config.state.parseServerState ? config.state.parseServerState(serverState) : serverState;
const userInfo = (window && window.__USER_INFO__) || {};

${clientStrategy.getStatePromise.createStoreFragment('store', 'initialState')}
const env = {store, userInfo, config};
if(typeof config.init ==='function') {
    config.init(env);
}

${clientStrategy.router.routerFragment('routeComponent', 'history')}
${wrapHoc}
${clientStrategy.render.renderFragment('renderComponent', 'root')}

if (!config.serviceworker && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/serviceworker.js')
  .then(function(reg) {
    // registration worked
    console.log('Registration succeeded. Scope is ' + reg.scope);
  }).catch(function(error) {
    // registration failed
    console.log('Registration failed with ' + error);
  });
}
	`
}

const generateClient = async (filename, strategy) => {
  try {
    const code = createClientCode(strategy)
    await fse.ensureFile(filename)
    return fse.writeFile(filename, code)
  } catch (e) {
    console.error("Couldn't create or write the client code.")
    console.error('Strategy: ', strategy)
    console.error(e)
    process.exit(-1)
  }
}

module.exports = generateClient
