const configMethod = (req, config, route, routeComponent) => {
  return new Promise((resolve, reject) => {
    config.getStatePromise(req, config, route, routeComponent, (err, state) => {
      if (err) {
        return reject(err)
      }
      resolve(state)
    })
  })
}

const getStatePromiseFn = (req, config, route, routeComponent) => {
  if (config.state && config.state.getStatePromise) {
    return configMethod
  } else {
    Promise.resolve({})
  }
}

const getStatePromise = {
  fn: getStatePromiseFn
}

export { getStatePromise }
