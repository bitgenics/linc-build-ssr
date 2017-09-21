import React from 'react';
import { match, RouterContext, createMemoryHistory } from 'react-router';
import ReactDOMServer from 'react-dom/server';
import { createStore, applyMiddleware, compose } from 'redux';
import { Provider } from 'react-redux';
import createPromiseCounter from 'redux-promise-counter';
import EventCollector from 'event-collector';
import createConfig from 'linc-config-js';
import assets from 'asset-manifest';

const packageJson = require(__dirname + '/../package.json');
const VERSION = packageJson.version;
const PROFILE = packageJson.name;

const config = typeof createConfig === 'function' ? createConfig('SERVER') : createConfig;

const polyfills_io = "https://cdn.polyfill.io/v2/polyfill.min.js?features="
const polyfillsURL = config.polyfills ? `${polyfills_io}${config.polyfills.replace(' ', '')}` : null;

const writeInitialHead = (req, res, settings) => {
    req.eventcollector.startJob('writeInitialHead');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.append('Link', `</${assets['vendor.js']}>;rel=preload;as=script`);
    res.append('Link', `</${assets['main.js']}>;rel=preload;as=script`);
    if(polyfillsURL) {
        res.append('Link', '<https://cdn.polyfill.io>;rel=dns-prefetch');
        res.append('Link', `<${polyfillsURL}>;rel=preload;as=script`);
    }
    
    res.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
    if(assets['vendor.css']) {
        res.write(`<link rel="stylesheet" href="/${assets['vendor.css']}">`);    
    }
    if(assets['main.css']) {
        res.write(`<link rel="stylesheet" href="/${assets['main.css']}">`);    
    }
    if(settings && settings.length > 0) {
        res.write(`<script>`);
            Object.keys(settings).forEach((key) => {res.write(`window.${key} = ${JSON.stringify(settings[key])};\n`)})
        res.write(`</script>`);
    }
    if(req.userInfo) {
        res.write(`<script>window.__USER_INFO__ = ${JSON.stringify(req.userInfo)};</script>`);
    }
    if(res.flush) { res.flush() }
    req.eventcollector.endJob('writeInitialHead');
}

const sendToClient = (req, res, html) => {
    req.eventcollector.startJob('sendMainContent');
    res.write(`</head><body><div id="root">${html}</div>`);
    if(polyfillsURL) {
        res.write(`<script src="${polyfillsURL}"></script>`);
    }
    res.write(`<script src="/${assets['vendor.js']}"></script>`);
    res.write(`<script src="/${assets['main.js']}"></script>`);
    res.end('</body></html>');
    req.eventcollector.endJob('rendering');
    req.eventcollector.endJob('sendMainContent');
}

const renderGet = (req, res, settings) => {
    req.eventcollector = req.eventcollector || new EventCollector({});
    req.eventcollector.addMeta({rendererVersion: VERSION, renderProfile: PROFILE});
    req.eventcollector.startJob('rendering');
    if(global.window && window.localStorage) window.localStorage.clear();
    if(global.window && window.sessionStorage) window.sessionStorage.clear();
    
    writeInitialHead(req, res, settings);
    sendToClient(req, res, '');
}

const isReusable = true;
const doGeoLookup = () => config.requestExtendedUserInfo

export {renderGet, isReusable, doGeoLookup}