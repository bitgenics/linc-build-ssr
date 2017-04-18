import React from 'react'
import { Router, browserHistory } from 'react-router'
import { render } from 'react-dom'
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'

import createConfig from 'linc-config-js'

const config = typeof createConfig === 'function' ? createConfig('CLIENT') : createConfig;
const configMiddleware = config.redux.middleware || [];
const initialState = (window && window.__INITIALSTATE__) || {};

const store = createStore(
    config.redux.reducer,
    initialState,
    applyMiddleware(...configMiddleware)
);

if(config.init) {
    config.init({store, config});
}

render(
    <Provider store={store}>
        <Router
            routes={config.router.routes}
            history={browserHistory}
        />
    </Provider>,
    document.getElementById('root')
);
