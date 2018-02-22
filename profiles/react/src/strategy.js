const semver = require('semver')

const pickInits = deps => {
  const inits = []
  if (deps['react-loadable']) {
    inits.push('react-loadable')
  }
  return inits
}

const pickRouter = deps => {
  if (deps['react-router']) {
    if (semver.lt(deps['react-router'], '4.0.0')) {
      return 'react-router-v3'
    } else {
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
    return 'config-redux'
  } else {
    return 'config-state'
  }
}

const pickPreRenders = deps => {
  const preRenders = []
  if (deps['react-loadable']) {
    preRenders.push('react-loadable')
  }
  if (deps['react-redux']) {
    preRenders.push('react-redux')
  }
  if (deps['styled-components']) {
    if (deps['babel-plugin-styled-components']) {
      preRenders.push('styled-components')
    } else {
      throw new Error(
        'Need to install "babel-plugin-styled-components" to be able to Server-Side Render styled-components'
      )
    }
  }
  return preRenders
}

const pickRenderer = deps => {
  if (deps['react']) {
    if (semver.lt(deps['react'], '16.0.0')) {
      return 'react15'
    } else {
      return 'react16'
    }
  } else {
    throw new Error('Only support react in this profile for now')
  }
}

const pickAfterRenders = deps => {
  const afterRenders = []
  if (deps['react-loadable']) {
    afterRenders.push('react-loadable')
  }
  if (deps['styled-components']) {
    afterRenders.push('styled-components')
  }
  if (deps['react-helmet']) {
    afterRenders.push('react-helmet')
  }
  return afterRenders
}

const getLibs = strategy => {
  const list = Object.keys(strategy).reduce((list, elem) => {
    return list.concat(strategy[elem])
  }, [])
  return list.filter((item, pos, self) => self.indexOf(item) === pos)
}

const createStrategy = (deps, useState) => {
  try {
    const strategy = {}
    strategy.inits = pickInits(deps)
    strategy.router = pickRouter(deps)
    strategy.render = pickRenderer(deps)
    if (useState) {
      strategy.getStatePromise = pickStatePromise(deps)
    }
    strategy.preRenders = pickPreRenders(deps)
    strategy.afterRenders = pickAfterRenders(deps)
    strategy.libs = getLibs(strategy)
    return strategy
  } catch (e) {
    console.error("We couldn't automatically figure out what plugins to use")
    console.error(e.message)
    process.exit(-1)
  }
}

module.exports = createStrategy
