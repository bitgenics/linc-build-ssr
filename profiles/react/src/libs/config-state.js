const getStatePromiseFn = (req, config, route, routeComponent) => {
  if (!config.state || config.state.getStatePromise) {
    return Promise.resolve({})
  }

  return new Promise(async (resolve, reject) => {
    try {
      const state = await config.state.getStatePromise(
        req,
        route,
        routeComponent
      )
      return resolve(state)
    } catch (e) {
      return reject(e)
    }
  })
}

const getStatePromise = {
  fn: getStatePromiseFn
}

export { getStatePromise }
