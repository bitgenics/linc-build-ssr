import path from 'path'
import React from 'react'
import { match, RouterContext } from 'react-router'
import ReactDOMServer from 'react-dom/server'
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'
import createPromiseCounter from 'redux-promise-counter'
import Helmet from 'react-helmet'
import config from 'linc-config-js'

const configMiddleware = config.redux.middleware || [];

const ignoreMiddleware = store => next => action => {
    next({type: 'ToIgnore'});
}

const renderPost = (url, body, callback) => {
    const promiseCounter = createPromiseCounter((state) => {
        const templ = require('marko').load(config.form_posts[url].redirect);
        templ.renderToString({redux: state, form: body}, (err, output) => {
            callback({statusCode: 302, location: output});
        })
    });
    const middleware = [promiseCounter].concat(configMiddleware);

    const store = createStore(
        config.redux.reducer,
        applyMiddleware(...middleware)
    );
    const actionCreator = config.form_posts[url];
    store.dispatch(actionCreator(body));
}

const renderGet = (url, callback) => {
    match({ routes: config.router.routes, location: url }, (error, redirectLocation, renderProps) => {
        if(error) {
            callback({statusCode:500, message: 'Error!'});
        } else if(redirectLocation) {
            callback({statusCode: 302, location: redirectLocation.pathname + redirectLocation.search});
        } else if (renderProps) {
            try {
                const promiseCounter = createPromiseCounter((state) => {
                    const store = createStore((s) => s, state, applyMiddleware(ignoreMiddleware));
                    const html = ReactDOMServer.renderToString(
                        <Provider store={store}>
                            <RouterContext {...renderProps} />
                        </Provider>
                    );
                    const head = Helmet.rewind();
                    if (head.htmlAttributes) head.htmlAttributes = head.htmlAttributes.toComponent()
                    const tags = ['title', 'link', 'meta', 'style'];
                    tags.forEach((tag) => {
                        head[tag] = head[tag].toString();
                    });
                    callback(null, {statusCode: 200, body:html, head, state});
                });
                const middleware = [promiseCounter].concat(configMiddleware);

                const store = createStore(
                    config.redux.reducer,
                    applyMiddleware(...middleware)
                );

                const html = ReactDOMServer.renderToString(
                    <Provider store={store}>
                        <RouterContext {...renderProps} />
                    </Provider>
                );
                Helmet.rewind();
            }
            catch (e) {
                console.log(e);
                callback({statusCode:500, message: 'Stuff happens'});
            }
        } else {
            callback(null, {statusCode: 404});
        }
    });
}

module.exports = {renderGet, renderPost}