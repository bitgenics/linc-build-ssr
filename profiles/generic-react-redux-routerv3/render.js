import React from 'react';
import { match, RouterContext } from 'react-router';
import ReactDOMServer from 'react-dom/server';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import createPromiseCounter from 'redux-promise-counter';
import Helmet from 'react-helmet';
import createConfig from 'linc-config-js';
import assets from 'asset-manifest';

const config = typeof createConfig === 'function' ? createConfig('SERVER') : createConfig;
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
    if(assets['vendor.css']) {
        res.write(`<link rel="stylesheet" href="/${assets['vendor.css']}">`);    
    }
    if(assets['main.css']) {
        res.write(`<link rel="stylesheet" href="/${assets['main.css']}">`);    
    }
    res.write(`<link rel="preload" as="script" href="/${assets['vendor.js']}">`);
    res.write(`<link rel="preload" as="script" href="/${assets['main.js']}">`);
    res.write(`<link rel="dns-prefetch" href="https://cdn.polyfill.io">`);
    res.write(`<link rel="preload" as="script" href="https://cdn.polyfill.io/v2/polyfill.min.js?features=default,fetch">`);
    res.write(`<script>window.${settings.variable}=${JSON.stringify(settings.settings)};</script>`);
    if(res.flush) { res.flush() }
    req.timings.firstFlush = toMsDiff(process.hrtime(), req.timings.start);

    const promiseCounter = createPromiseCounter((state) => {
        req.timings.secondRenderStart = toMsDiff(process.hrtime(), req.timings.start);
        const secondRenderStart = process.hrtime();
        res.write(`<script>window.__INITIALSTATE__ = ${JSON.stringify(state)};</script>`);
        const store = createStore((s) => s, state, applyMiddleware(ignoreMiddleware));
        const html = ReactDOMServer.renderToString(
            <Provider store={store}>
                <RouterContext {...renderProps} />
            </Provider>
        );
        const head = Helmet.rewind();
        const tags = ['title', 'link', 'meta', 'style', 'script'];
        tags.forEach((tag) => {
            res.write(head[tag].toString());
        });
        
        res.write(`</head><body><div id="root">${html}</div>`);
        res.write(`<script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=default,fetch"></script>`);
        res.write(`<script src="/${assets['vendor.js']}"></script>`);
        res.write(`<script src="/${assets['main.js']}"></script>`);
        res.end('</body></html>');
        req.timings.secondRender = toMsDiff(process.hrtime(), secondRenderStart);
    });
    const createStoreStart = process.hrtime();
    const middleware = [promiseCounter].concat(configMiddleware);
    const store = createStore(
        config.redux.reducer,
        applyMiddleware(...middleware)
    );
    if(config.init) {
        config.init({store, config});
    }

    req.timings.createStore = toMsDiff(process.hrtime(), createStoreStart);
    req.timings.firstRenderStart = toMsDiff(process.hrtime(), req.timings.start);
    const firstRenderStart = process.hrtime();
    const html = ReactDOMServer.renderToString(
        <Provider store={store}>
            <RouterContext {...renderProps} />
        </Provider>
    );
    req.timings.firstRender = toMsDiff(process.hrtime(), firstRenderStart);
    Helmet.rewind();
}


const renderGet = (req, res, settings) => {
    req.timings = req.timings || { start: process.hrtime() }
    req.timings.renderStart = toMsDiff(process.hrtime(), req.timings.start);
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
            console.log(`Could not find url: ${req.url}`);
            console.log(config.router.routes);
            res.end();
        }
    });
}

const toMsDiff = (end, start) => (1000 * (end[0] - start[0])) + ((end[1] - start[1])/1000000)

module.exports = {renderGet}