import path from 'path'
import React from 'react'
import { match, RouterContext } from 'react-router'
import ReactDOMServer from 'react-dom/server'
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'
import createPromiseCounter from 'redux-promise-counter'
import Helmet from 'react-helmet'
import dot from 'dot'
import config from 'linc-config-js'

//doT.templateSettings.encode = /\$\{([\s\S]+?)\}/g

const configMiddleware = config.redux.middleware || [];

const ignoreMiddleware = store => next => action => {
    next({type: 'ToIgnore'});
}

const renderPost = (url, body, callback) => {
    const promiseCounter = createPromiseCounter((state) => {
        const redirect = config.form_posts[url].redirect;
        const templ = dot.template(redirect);
        const location = templ({redux: state, form: body});
        callback(null, {statusCode:302, location});
    });
    const middleware = [promiseCounter].concat(configMiddleware);

    const store = createStore(
        config.redux.reducer,
        applyMiddleware(...middleware)
    );
    const actionCreator = config.form_posts[url].actionCreator;
    console.log('actionCreator', actionCreator);
    store.dispatch(actionCreator(body));
}

const renderGet = (url, callback) => {
    match({ routes: config.router.routes, location: url }, (error, redirectLocation, renderProps) => {
        if(error) {
            callback(null, {statusCode:500, message: 'Error!'});
        } else if(redirectLocation) {
            callback(null, {statusCode: 302, location: redirectLocation.pathname + redirectLocation.search});
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
                callback(null, {statusCode:500, message: 'Stuff happens'});
            }
        } else {
            callback(null, {statusCode: 404});
        }
    });
}

module.exports = {renderGet, renderPost}