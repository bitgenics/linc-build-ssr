const routerFn = (req, config) => {
  return new Promise((resolve, reject) => {
    if (config.root) {
      resolve({routeComponent: config.root})
    } else {
      reject('Root component not defined in config.root')
    }
  })
}

const router = {
  fn: routerFn
}

export { router }
