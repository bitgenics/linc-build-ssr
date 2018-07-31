const path = require('path')
const fse = require('fs-extra')

const steps = [
  'inits',
  'getStatePromise',
  'router',
  'preRenders',
  'render',
  'afterRenders'
]

const mapValues = (obj, iterator) => {
  const keys = Object.keys(obj)
  const mapped = {}
  keys.forEach(key => {
    mapped[key] = iterator(obj[key], key, obj)
  })
  return mapped
}

const getImports = strategy => {
  const libs = strategy.libs
    .map(lib => {
      if (lib) return requireLib(lib)
    })
    .filter(e => e)
  const fragments = libs.map(
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
      clientStrategy[step] = module.map(name => requireLib(name)).filter(e => e)
    }
  })
  return clientStrategy
}

const createClientCode = strategy => {
  const clientStrategy = createClientStrategy(strategy)

  let preRenderCode
  if (clientStrategy.preRenders) {
    const preRenders = clientStrategy.preRenders.filter(
      e => e.preRenderFragment
    )
    const fragments = preRenders.map(preRender =>
      preRender.preRenderFragment('renderComponent', 'store')
    )
    preRenderCode = fragments.join('\n')
  }

  const inits = clientStrategy.inits
    .map(init => init.initFragment())
    .filter(e => e)
  let runRender = 'main()'
  if (inits.length > 0) {
    runRender = `window.onload = () => {
      Promise.all([
  ${inits.join('\n')}
]).then(main())
}
    `
  }

  const createStoreFragment =
    clientStrategy.getStatePromise &&
    clientStrategy.getStatePromise.createStoreFragment &&
    clientStrategy.getStatePromise.createStoreFragment('store', 'initialState')

  return `${getImports(strategy)}

import createConfig from 'linc-config-js'

const config = typeof createConfig === 'function' ? createConfig('CLIENT') : createConfig;

const serverState = (window && window.__INITIALSTATE__);
const initialState = config.state && config.state.parseServerState ? config.state.parseServerState(serverState) : serverState;
const userInfo = (window && window.__USER_INFO__) || {};

const main = () => {
  ${createStoreFragment || ''}
  const env = {store, userInfo, config};
  if(typeof config.init ==='function') {
      config.init(env);
  }

  ${clientStrategy.router.routerFragment('routeComponent', 'history')}
  let renderComponent = routeComponent
  ${preRenderCode || ''}
  ${clientStrategy.render.renderFragment('renderComponent', 'root')}
}

${runRender}

if (!config.disableServiceWorker && 'serviceWorker' in navigator) {
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
