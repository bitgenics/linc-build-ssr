import React from 'react'
import ReactDOMServer from 'react-dom/server.browser'
import createPromiseCounter from 'redux-promise-counter'
import { createStore, applyMiddleware, compose } from 'redux'
import { Provider } from 'react-redux'

const getStatePromiseFn = (req, config, route, routeComponent) => {
  return new Promise(async (resolve, reject) => {
    const eventcollector = req.eventcollector
    const promiseCounter = createPromiseCounter((state, async) => {
      return resolve(state)
    })

    try {
      const middleware = [promiseCounter].concat(config.redux.middleware)
      const enhancer = config.redux.enhancers
        ? compose(applyMiddleware(...middleware), ...config.redux.enhancers)
        : applyMiddleware(...middleware)
      const initialState = config.redux.initialState || {}

      const store = createStore(config.redux.reducer, initialState, enhancer)
      const env = { req, store, config, history: req.history }
      if (config.init === 'function') {
        config.init(env)
      }

      ReactDOMServer.renderToString(
        <Provider store={store}>{routeComponent}</Provider>
      )
    } catch (e) {
      eventcollector.addError(e)
      return reject(e)
    }
  })
}

const getStatePromise = {
  fn: getStatePromiseFn
}

export { getStatePromise }
