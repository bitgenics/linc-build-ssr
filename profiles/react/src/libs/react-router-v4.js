import React from 'react'
import StaticRouter from 'react-router-dom/StaticRouter'

const routerFn = (req, config) => {
  return new Promise((resolve, reject) => {
    const context = {}
    const routeComponent = <StaticRouter location={req.url} context={context}>{config.root}</StaticRouter>
    resolve({routeComponent})
  })
}

const router = {
  fn: routerFn
}

export { router }
