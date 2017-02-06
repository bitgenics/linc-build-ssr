import React from 'react'
import { Router, browserHistory } from 'react-router'
import { render } from 'react-dom'
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'

import config from 'linc-config-js'

const configMiddleware = config.redux.middleware || [];
const initialState = (window && window.__INITIALSTATE__) || {};

const store = createStore(
    config.redux.reducer,
    initialState,
    applyMiddleware(...configMiddleware)
);

render(
    <Provider store={store}>
        <Router
            routes={config.router.routes}
            history={browserHistory}
        />
    </Provider>,
    document.getElementById('root')
);
