import React from 'react';
import { match, RouterContext, createMemoryHistory } from 'react-router';
import ReactDOMServer from 'react-dom/server';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import createPromiseCounter from 'redux-promise-counter';
import Helmet from 'react-helmet';
import createConfig from 'linc-config-js';
import assets from 'asset-manifest';

const VERSION = require(__dirname + '/package.json').version;

const config = typeof createConfig === 'function' ? createConfig('SERVER') : createConfig;
const configMiddleware = config.redux.middleware || [];

const ignoreMiddleware = store => next => action => {
    next({type: 'ToIgnore'});
}

const writeInitialHead = (req, res, settings) => {
    const writeHeadStart = process.hrtime();
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
    res.write(`<script>`);
        Object.keys(settings).forEach((key) => {res.write(`window.${key} = ${JSON.stringify(settings[key])}`)})
    res.write(`</script>`);
    req.timings.writeHeadDuration = toMsDiff(process.hrtime(), writeHeadStart);
    req.timings.firstFlushStartAt = toMsDiff(process.hrtime(), req.timings.start);
    if(res.flush) { res.flush() }
}

const initialSetup = (req) => {
    const memoryHistory = createMemoryHistory(req.url);
    if(config.init ==='function') {
        config.init(env);
    }
}

const firstRenderPass = (req, promiseCounter, renderProps) => {
    req.timings.firstRenderStartAt = toMsDiff(process.hrtime(), req.timings.start);
    const memoryHistory = createMemoryHistory(req.url);
    const createStoreStart = process.hrtime();
    const middleware = [promiseCounter].concat(configMiddleware);
    const store = createStore(
        config.redux.reducer,
        applyMiddleware(...middleware)
    );
    req.timings.createStoreDuration = toMsDiff(process.hrtime(), createStoreStart);
    const env = {store, config, history: memoryHistory};
    if(config.init ==='function') {
        config.init(env);
    }

    const firstRenderStart = process.hrtime();
    const html = ReactDOMServer.renderToString(
        <Provider store={env.store}>
            <RouterContext {...renderProps} />
        </Provider>
    );
    const head = Helmet.rewind();
    req.timings.firstRenderDuration = toMsDiff(process.hrtime(), firstRenderStart);
    return {html, head}
}

const secondRenderPass = (req, state, renderProps) => {
    req.timings.secondRenderStartAt = toMsDiff(process.hrtime(), req.timings.start);
    const secondRenderStart = process.hrtime();
    const store = createStore((s) => s, state, applyMiddleware(ignoreMiddleware));
    const html = ReactDOMServer.renderToString(
        <Provider store={store}>
            <RouterContext {...renderProps} />
        </Provider>
    );
    const head = Helmet.rewind();
    req.timings.secondRenderDuration = toMsDiff(process.hrtime(), secondRenderStart);
    return {html, head};
}

const sendToClient = (req, res, html, head) => {
    req.timings.writeContentStartAt = toMsDiff(process.hrtime(), req.timings.start);
    const writeContentStart = process.hrtime();
    const tags = ['title', 'link', 'meta', 'style', 'script'];
    tags.forEach((tag) => {
        res.write(head[tag].toString());
    });
    
    res.write(`</head><body><div id="root">${html}</div>`);
    res.write(`<script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=default,fetch"></script>`);
    res.write(`<script src="/${assets['vendor.js']}"></script>`);
    res.write(`<script src="/${assets['main.js']}"></script>`);
    res.end('</body></html>');   
    req.timings.writeContentDuration = toMsDiff(process.hrtime(), writeContentStart);
}

const render200 = (req, res, renderProps, settings) => {
    writeInitialHead(req, res, settings);
    const promiseCounter = createPromiseCounter((state, async) => {
        res.write(`<script>window.__INITIALSTATE__ = ${JSON.stringify(state)};</script>`);
        if(async) {
            const results = secondRenderPass(req, state, renderProps);
            sendToClient(req, res, results.html, results.head);
        } else {
            sendToClient(req, res, firstResults.html, firstResults.head);
        }
    });

    const firstResults = firstRenderPass(req, promiseCounter, renderProps);
}

const renderGet = (req, res, settings) => {
    req.timings = req.timings || { start: process.hrtime() }
    req.timings.renderStartAt = toMsDiff(process.hrtime(), req.timings.start);
    if(window.localStorage) window.localStorage.clear();
    if(window.sessionStorage) window.sessionStorage.clear();
    
    match({ routes: config.router.routes, location: req.url }, (error, redirectLocation, renderProps) => {
        req.timings.matchDuration = toMsDiff(process.hrtime(), req.timings.start);
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

const toMsDiff = (end, start) => {
    const ms = (1000 * (end[0] - start[0])) + ((end[1] - start[1])/1000000);
    return Math.round(ms*1000)/1000;
}

module.exports = {renderGet}