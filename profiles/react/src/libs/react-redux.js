import React from 'react'
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'

const preRendersFn = (req, routeComponent, state) => {
  const ignoreMiddleware = store => next => action => {
    next({ type: 'ToIgnore' })
  }
  const store = createStore(s => s, state, applyMiddleware(ignoreMiddleware))
  return <Provider store={store}>{routeComponent}</Provider>
}

const preRenders = {
  fn: preRendersFn
}

export { preRenders }
