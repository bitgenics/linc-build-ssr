import { createMemoryHistory } from 'history';
import EventCollector from 'event-collector';
import lincConfig from 'linc-config-js';
import assets from 'asset-manifest';

const packageJson = require(__dirname + '/../package.json');
const VERSION = packageJson.version;
const PROFILE = packageJson.name;

const funcs = {}
funcs.match = require('./react-router-v3').match.fn;
funcs.renderToString = require('./react').renderToString.fn;
funcs.getStatePromiseFromRoute = require('./promiseCounter').getStatePromiseFromRoute.fn

funcs.wrapInStoreHoC = require('./react-redux').wrapInStoreHoC.fn

funcs.afterRenders = [
    (config, assets) => {
        return {head: config.head.renderStatic() };
    }
]

const init = (req) => {
    req.eventcollector = req.eventcollector || new EventCollector({});
    req.eventcollector.addMeta({rendererVersion: VERSION, renderProfile: PROFILE});
    req.eventcollector.startJob('rendering');
    if(global.window && window.localStorage) window.localStorage.clear();
    if(global.window && window.sessionStorage) window.sessionStorage.clear();
    req.history = createMemoryHistory(req.url);
    return req.eventcollector;
}

const createConfig = (req, lincConfig) => {
    return typeof lincConfig === 'function' ? createConfig('SERVER', req) : lincConfig;
}

const redirect = (res, redirectLocation) => {
    res.statusCode = 302;
    res.setHeader('Location', redirectLocation.pathname + redirectLocation.search);
    res.end();
}

const notfound = (res) => {
    res.statusCode = 404;
    res.end();
}

const sendInitialHeaders = (res, config, assets) => {
    const polyfills_io = "https://cdn.polyfill.io/v2/polyfill.min.js?features="
    const polyfillsURL = config.polyfills ? `${polyfills_io}${config.polyfills.replace(' ', '')}` : null;
    res.setHeader('Content-Type', 'text/html');
    if(assets['bootstrap.js']) { res.append('Link', `</${assets['bootstrap.js']}>;rel=preload;as=script`); }
    if(assets['vendor.js']) { res.append('Link', `</${assets['vendor.js']}>;rel=preload;as=script`); }
    if(assets['main.js']) { res.append('Link', `</${assets['main.js']}>;rel=preload;as=script`); }
    if(polyfillsURL) {
        res.append('Link', '<https://cdn.polyfill.io>;rel=dns-prefetch');
        res.append('Link', `<${polyfillsURL}>;rel=preload;as=script`);
    }
}

const sendHeadAssets = (res, assets) => {
    res.write('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
    if(assets['bootstrap.css']) {
        res.write(`<link rel="stylesheet" href="/${assets['bootstrap.css']}">`);    
    }
    if(assets['vendor.css']) {
        res.write(`<link rel="stylesheet" href="/${assets['vendor.css']}">`);    
    }
    if(assets['main.css']) {
        res.write(`<link rel="stylesheet" href="/${assets['main.css']}">`);    
    }
}

const sendSettings = (res, settings) => {
    res.write(`<script>`);
        Object.keys(settings).forEach((key) => {res.write(`window.${key} = ${JSON.stringify(settings[key])};\n`)})
    res.write(`</script>`);
}

const headTags = ['title', 'link', 'meta', 'style', 'script'];
const dynamicHeadToString = (head) => {
    if(head) {
        const strArray = headTags.map((tag) => head[tag] && head[tag].toString());
        return strArray.reduce((previous, current) => (current ? previous + current : previous), '' );
    } else {
        return '';
    }
}

const sendDynamicHead = (res, head) => {
    res.write(dynamicHeadToString(head));
}

const afterRender = (config, assets) => {
    const results = funcs.afterRenders.map((fn) => fn(config));
    const ret = results.reduce((previous, current) => {
        return {
            head: previous.head + dynamicHeadToString(current.head),
            footer: previous.footer + (current.footer || '')
        }
    }, {head: '', footer: ''});
    return ret;
}

const renderGet = async (req, res, settings) => {
    try {
        const eventcollector = init(req);
        const config = createConfig(req, lincConfig);
        const { redirectLocation, route, routeComponent } = await funcs.match(req, config);
        if(redirectLocation) {
            return redirect(res, redirectLocation);
        } else if(!routeComponent) {
            return notfound(res);
        }
        const getStatePromise = funcs.getStatePromiseFromRoute(req, config, route, routeComponent, store);
        res.statusCode = 200;
        sendInitialHeaders(res, config, assets);
        //sendHeaders(matchUrl(res, serverConfig.headers));
        res.write('<!DOCTYPE html><html><head>');
        //sendStaticHead(res, serverConfig.staticHead);
        sendHeadAssets(res, assets);
        sendSettings(res, settings);
        if(res.flush) { res.flush() }
        const state = await getStatePromise;
        if(state.json) {
            res.write(`<script>window.__INITIALSTATE__ = ${JSON.stringify(state.json)};</script>`);
            //if(serverConfig.renderHead) {
            //    sendDynamicHead(res, serverConfig.renderHead(req, state.json));
            //}
        }
        if(funcs.renderToStream ) {
            res.write('</head><body><div id="root">');
            //stream the things
            res.write('</div>');
            const { footer } = funcs.afterRender(config, assets);
            res.write(`</head><body><div id="root">${html}</div>`);
            if(footer) { 
                res.write(footer);
            }
        } else {
            const html = state.html || await funcs.renderToString(funcs.wrapInStoreHoC(state.json, routeComponent));
            const { head, footer } = afterRender(config, assets);
            if(head) { res.write(head); }
            res.write(`</head><body><div id="root">${html}</div>`);
            if(footer) { res.write(footer); }
        }
        res.write('</body></html>');
        res.end();
    } catch (e) {
        console.log('Uhoh!', e);
    }
}

const isReusable = true;

export {renderGet, isReusable}