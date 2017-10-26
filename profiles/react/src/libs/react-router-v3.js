import React from 'react'
import {
  match as matchRoute,
  RouterContext,
  createMemoryHistory
} from 'react-router'

const routerFn = (req, config) => {
  return new Promise((resolve, reject) => {
    matchRoute(
      { routes: config.router.routes, location: req.url },
      (err, redirectLocation, renderProps) => {
        if (err) {
          return reject(err)
        }
        const routeComponent = renderProps ? (
          <RouterContext {...renderProps} />
        ) : null
        resolve({
          redirectLocation,
          route: renderProps,
          routeComponent
        })
      }
    )
  })
}

const router = {
  fn: routerFn
}

export { router }
