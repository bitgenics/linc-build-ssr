import {
  createStore as reduxCreateStore,
  applyMiddleware,
  compose
} from 'redux'

const createStoreFn = config => {
  const configMiddleware = config.redux.middleware || []
  const serverState = (window && window.__INITIALSTATE__) || {}
  const initialState = config.redux.parseServerState
    ? config.redux.parseServerState(serverState)
    : serverState
  const enhancer = config.redux.enhancers
    ? compose(applyMiddleware(...configMiddleware), ...config.redux.enhancers)
    : applyMiddleware(...configMiddleware)

  return reduxCreateStore(config.redux.reducer, initialState, enhancer)
}

const createStore = {
  fn: createStoreFn
}

export { createStore }
