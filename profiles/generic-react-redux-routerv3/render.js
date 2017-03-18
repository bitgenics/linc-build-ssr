import React from 'react';
import { match, RouterContext } from 'react-router';
import ReactDOMServer from 'react-dom/server';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import createPromiseCounter from 'redux-promise-counter';
import Helmet from 'react-helmet';
import url_templ from 'url-templating';
import config from 'linc-config-js';
import assets from 'asset-manifest';

const configMiddleware = config.redux.middleware || [];

const ignoreMiddleware = store => next => action => {
    next({type: 'ToIgnore'});
}

const render200 = (req, res, renderProps, settings) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.write('<html><head>');
    res.write('<meta charset="utf-8">');
    res.write('<meta name="viewport" content="width=device-width, initial-scale=1">');
    res.write(`<link rel="stylesheet" href="/${assets['vendor.css']}">`);
    res.write(`<link rel="stylesheet" href="/${assets['main.css']}">`);
    res.write(`<link rel="preload" as="script" href="/${assets['vendor.js']}">`);
    res.write(`<link rel="preload" as="script" href="/${assets['main.js']}">`);
    res.write(`<link rel="dns-prefetch" href="https://polyfill.io">`);
    res.write(`<link rel="preload" as="script" href="https://polyfill.io/v2/polyfill.min.js?features=default,fetch">`);
    res.write(`<script>window.${settings.variable}=${JSON.stringify(settings.settings)};</script>`);
    if(res.flush) { res.flush() }

    const promiseCounter = createPromiseCounter((state) => {
        res.write(`<script>window.__INITIALSTATE__ = ${JSON.stringify(state)};</script>`);
        const store = createStore((s) => s, state, applyMiddleware(ignoreMiddleware));
        const html = ReactDOMServer.renderToString(
            <Provider store={store}>
                <RouterContext {...renderProps} />
            </Provider>
        );
        const head = Helmet.rewind();
        const tags = ['title', 'link', 'meta', 'style'];
        tags.forEach((tag) => {
            res.write(head[tag].toString());
        });
        
        res.write(`</head><body><div id="root">${html}</div>`);
        res.write(`<script src="https://polyfill.io/v2/polyfill.min.js?features=default,fetch"></script>`);
        res.write(`<script src="/${assets['vendor.js']}"></script>`);
        res.write(`<script src="/${assets['main.js']}"></script>`);
        res.end('</body></html>');
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


const renderGet = (req, res, settings) => {
    match({ routes: config.router.routes, location: req.url }, (error, redirectLocation, renderProps) => {
        if(error) {
            res.statusCode = 500;
            res.end();
        } else if(redirectLocation) {
            res.statusCode = 302;
            res.setHeader('Location', redirectLocation.pathname + redirectLocation.search);
            res.end();
        } else if (renderProps) {
            try {
                render200(req, res, renderProps, settings);
            }
            catch (e) {
                console.log(e);
                res.statusCode = 500;
                res.end();
            }
        } else {
            res.statusCode = 404;
            res.end();
        }
    });
}

module.exports = {renderGet}