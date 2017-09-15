import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import createHistory from 'history/createBrowserHistory'
import config from 'linc-config-js'

const history = createHistory()
const { store } = config.redux.configureStore(history, window.REDUX_STATE)

const render = App => {
  const root = document.getElementById('root')

  ReactDOM.render(
      <Provider store={store}>
        <App />
      </Provider>,
    root
  )
}

render(config.app)