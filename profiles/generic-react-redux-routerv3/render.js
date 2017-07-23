import React from 'react';
import { match, RouterContext, createMemoryHistory } from 'react-router';
import ReactDOMServer from 'react-dom/server';
import { createStore, applyMiddleware, compose } from 'redux';
import { Provider } from 'react-redux';
import createPromiseCounter from 'redux-promise-counter';
import EventCollector from 'event-collector';
import Helmet from 'react-helmet';
import createConfig from 'linc-config-js';
import assets from 'asset-manifest';

const packageJson = require(__dirname + '/package.json');
const VERSION = packageJson.version;
const PROFILE = packageJson.name;

const config = typeof createConfig === 'function' ? createConfig('SERVER') : createConfig;
const configMiddleware = config.redux.middleware || [];

const ignoreMiddleware = store => next => action => {
    next({type: 'ToIgnore'});
}

const writeInitialHead = (req, res, settings) => {
    req.eventcollector.startJob('writeInitialHead');
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
        Object.keys(settings).forEach((key) => {res.write(`window.${key} = ${JSON.stringify(settings[key])};\n`)})
    res.write(`</script>`);
    req.eventcollector.startJob('firstFlush');
    if(res.flush) { res.flush() }
    req.eventcollector.endJob('firstFlush');
    req.eventcollector.endJob('writeInitialHead');
}

const getUserInfo = (req, callback) => {
    if(config.requestExtendedUserInfo) {
        req.eventcollector.startJob('requestExtendedUserInfo');
        fetch(`https://freegeoip.net/json/${req.ip}`).then((response) => {
            return response.json();
        }).then((json) => {
            req.eventcollector.endJob('requestExtendedUserInfo');
            callback(undefined, json);
        }).catch((error) => {
            req.eventcollector.addError(error);
            callback(undefined, {ip: req.ip});
        });
    } else {
        callback(undefined, {ip: req.ip});
    }
}

const initEnvironment = (req, promiseCounter, callback) => {
    req.eventcollector.startJob('rendererInitialSetup');
    getUserInfo(req, (err, userInfo) => {
        req.userInfo = userInfo;
        const memoryHistory = createMemoryHistory(req.url);
        const middleware = [promiseCounter].concat(configMiddleware);
        const enhancer = config.redux.enhancers ? 
                        compose(applyMiddleware(...middleware), ...config.redux.enhancers) :
                        applyMiddleware(...middleware);
        const initialState = config.redux.initialState || {}

        const store = createStore(
            config.redux.reducer,
            initialState,
            enhancer
        );
        
        const env = {req, userInfo, store, config, history: memoryHistory};
        if(config.init ==='function') {
            config.init(env);
        }
        callback(null, env);
        req.eventcollector.endJob('rendererInitialSetup');
    });
}

const firstRenderPass = (env, renderProps) => {
    try {
        env.req.eventcollector.startJob('firstRender');
        const html = ReactDOMServer.renderToString(
            <Provider store={env.store}>
                <RouterContext {...renderProps} />
            </Provider>
        );
        const head = Helmet.rewind();
        env.req.eventcollector.endJob('firstRender');
        return {html, head}
    } catch(e) {
        console.log(e);
        env.req.eventcollector.endJob('firstRender');
        env.addError(e);
        return {html: '', head: Helmet.rewind() }
    }
}

const secondRenderPass = (req, state, renderProps) => {
    req.eventcollector.startJob('secondRenderPass');
    const store = createStore((s) => s, state, applyMiddleware(ignoreMiddleware));
    const html = ReactDOMServer.renderToString(
        <Provider store={store}>
            <RouterContext {...renderProps} />
        </Provider>
    );
    const head = Helmet.rewind();
    req.eventcollector.endJob('secondRenderPass');
    return {html, head};
}

const sendToClient = (req, res, html, head) => {
    req.eventcollector.startJob('sendMainContent');
    const writeContentStart = process.hrtime();
    const tags = ['title', 'link', 'meta', 'style', 'script'];
    tags.forEach((tag) => {
        if(head[tag]) {
            res.write(head[tag].toString());
        }
    });
    res.write(`<script>window.__USER_INFO__ = ${JSON.stringify(req.userInfo)};</script>`);
    res.write(`</head><body><div id="root">${html}</div>`);
    res.write(`<script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=default,fetch"></script>`);
    res.write(`<script src="/${assets['vendor.js']}"></script>`);
    res.write(`<script src="/${assets['main.js']}"></script>`);
    res.end('</body></html>');
    req.eventcollector.endJob('rendering');
    req.eventcollector.endJob('sendMainContent');
}

const render200 = (req, res, renderProps, settings) => {
    writeInitialHead(req, res, settings);
    let firstResults = undefined;
    const promiseCounter = createPromiseCounter((state, async) => {
        res.write(`<script>window.__INITIALSTATE__ = ${JSON.stringify(state)};</script>`);
        if(async) {
            const results = secondRenderPass(req, state, renderProps);
            sendToClient(req, res, results.html, results.head);
        } else if(firstResults) {
            sendToClient(req, res, firstResults.html, firstResults.head);
        } else {
            sendToClient(req, res, '', {});
        }
    });

    initEnvironment(req, promiseCounter, (err, env) => {
        firstResults = firstRenderPass(env, renderProps);
    })
}

const renderGet = (req, res, settings) => {
    req.eventcollector = req.eventcollector || new EventCollector({});
    req.eventcollector.addMeta({rendererVersion: VERSION, renderProfile: PROFILE});
    req.eventcollector.startJob('rendering');
    if(global.window && window.localStorage) window.localStorage.clear();
    if(global.window && window.sessionStorage) window.sessionStorage.clear();
    
    req.eventcollector.startJob('match');
    match({ routes: config.router.routes, location: req.url }, (error, redirectLocation, renderProps) => {
        req.eventcollector.endJob('match');
        if(error) {
            res.statusCode = 500;
            req.eventcollector.addError(error);
            res.end();
            req.eventcollector.endJob('rendering');
        } else if(redirectLocation) {
            res.statusCode = 302;
            res.setHeader('Location', redirectLocation.pathname + redirectLocation.search);
            res.end();
            req.eventcollector.endJob('rendering');
        } else if (renderProps) {
            try {
                render200(req, res, renderProps, settings);
            }
            catch (e) {
                req.eventcollector.addError(e);
                if(!res.headersSent) {
                    res.statusCode = 500;
                }
                res.end();
            }
        } else {
            res.statusCode = 404;
            res.end();
            req.eventcollector.endJob('rendering');
        }
    });
}

module.exports = {renderGet}