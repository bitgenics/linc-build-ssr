const semver = require('semver')

const pickRouter = deps => {
  if (deps['react-router']) {
    if (semver.lt(deps['react-router'], '4.0.0')) {
      return 'react-router-v3'
    } else {
      console.log('Do not support react-routerV4 just yet')
      return 'react-router-v4'
    }
  } else if (deps['react-router-dom']) {
    return 'react-router-v4'
  } else {
    return 'config-router'
  }
}

const pickStatePromise = deps => {
  if (deps['redux']) {
    return 'promiseCounter'
  } else {
    return 'config-state'
  }
}

const pickWrapInStoreHoC = deps => {
  if (deps['react-redux']) {
    return 'react-redux'
  }
}

const pickRenderer = deps => {
  if (deps['react']) {
    if (semver.lt(deps['react'], '16.0.0')) {
      return 'react15'
    } else {
      return 'react16'
    }
  } else {
    console.error('Only support react in this profile for now')
    process.exit(-1)
  }
}

const pickafterRender = deps => {
  const afterRender = []
  if (deps['react-helmet']) {
    afterRender.push('react-helmet')
  }
  return afterRender
}

const createStrategy = deps => {
  try {
    const strategy = {}
    strategy.router = pickRouter(deps)
    strategy.render = pickRenderer(deps)
    strategy.getStatePromise = pickStatePromise(deps)
    strategy.wrapInStoreHoC = pickWrapInStoreHoC(deps)
    strategy.afterRender = pickafterRender(deps)
    return strategy
  } catch (e) {
    console.error("We couldn't automatically figure out what plugins to use")
    console.error(e)
    process.exit(-1)
  }
}

module.exports = createStrategy
