import React from 'react'
import { Router, browserHistory } from 'react-router'
import { render } from 'react-dom'
import { createStore, applyMiddleware, compose } from 'redux'
import { Provider } from 'react-redux'

import createConfig from 'linc-config-js'

const config =
  typeof createConfig === 'function' ? createConfig('CLIENT') : createConfig
const configMiddleware = config.redux.middleware || []
const serverState = (window && window.__INITIALSTATE__) || {}
const userInfo = (window && window.__USER_INFO__) || {}
const initialState = config.redux.parseServerState
  ? config.redux.parseServerState(serverState)
  : serverState

const enhancer = config.redux.enhancers
  ? compose(applyMiddleware(...configMiddleware), ...config.redux.enhancers)
  : applyMiddleware(...configMiddleware)

const store = createStore(config.redux.reducer, initialState, enhancer)

const env = { store, userInfo, config, history: browserHistory }
if (typeof config.init === 'function') {
  config.init(env)
}

render(
  <Provider store={env.store}>
    <Router routes={config.router.routes} history={env.history} />
  </Provider>,
  document.getElementById('root')
)
