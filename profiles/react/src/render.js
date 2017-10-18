import { createMemoryHistory } from 'history'
import EventCollector from 'event-collector'
import createConfig from 'linc-config-js'
import assets from 'asset-manifest'
import strategy from 'server-strategy'

const packageJson = require(__dirname + '/../package.json')
const VERSION = packageJson.version
const PROFILE = packageJson.name

const init = req => {
  req.eventcollector = req.eventcollector || new EventCollector({})
  req.eventcollector.addMeta({
    rendererVersion: VERSION,
    renderProfile: PROFILE
  })
  req.eventcollector.startJob('rendering')
  if (global.window && window.localStorage) window.localStorage.clear()
  if (global.window && window.sessionStorage) window.sessionStorage.clear()
  req.history = createMemoryHistory(req.url)
  return req.eventcollector
}

const config =
  typeof createConfig === 'function' ? createConfig('SERVER') : createConfig

const polyfills_io = 'https://cdn.polyfill.io/v2/polyfill.min.js?features='
const polyfillsURL = config.polyfills
  ? `${polyfills_io}${config.polyfills.replace(' ', '')}`
  : null

const redirect = (res, redirectLocation) => {
  res.statusCode = 302
  res.setHeader('Location', redirectLocation.pathname + redirectLocation.search)
  res.end()
}

const notfound = res => {
  res.statusCode = 404
  res.end()
}

const sendInitialHeaders = (res, assets) => {
  res.setHeader('Content-Type', 'text/html')
  if (assets['bootstrap.js']) {
    res.append('Link', `</${assets['bootstrap.js']}>;rel=preload;as=script`)
  }
  if (assets['vendor.js']) {
    res.append('Link', `</${assets['vendor.js']}>;rel=preload;as=script`)
  }
  if (assets['main.js']) {
    res.append('Link', `</${assets['main.js']}>;rel=preload;as=script`)
  }
  if (polyfillsURL) {
    res.append('Link', '<https://cdn.polyfill.io>;rel=dns-prefetch')
    res.append('Link', `<${polyfillsURL}>;rel=preload;as=script`)
  }
}

const sendHeadAssets = (res, assets) => {
  res.write(
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  )
  if (assets['bootstrap.css']) {
    res.write(`<link rel="stylesheet" href="/${assets['bootstrap.css']}">`)
  }
  if (assets['vendor.css']) {
    res.write(`<link rel="stylesheet" href="/${assets['vendor.css']}">`)
  }
  if (assets['main.css']) {
    res.write(`<link rel="stylesheet" href="/${assets['main.css']}">`)
  }
}

const sendSettings = (res, settings) => {
  res.write(`<script>`)
  Object.keys(settings).forEach(key => {
    res.write(`window.${key} = ${JSON.stringify(settings[key])};\n`)
  })
  res.write(`</script>`)
}

const headTags = ['title', 'link', 'meta', 'style', 'script']
const dynamicHeadToString = head => {
  if (head) {
    const strArray = headTags.map(tag => head[tag] && head[tag].toString())
    return strArray.reduce(
      (previous, current) => (current ? previous + current : previous),
      ''
    )
  } else {
    return ''
  }
}

const sendDynamicHead = (res, head) => {
  res.write(dynamicHeadToString(head))
}

const afterRender = assets => {
  const results = strategy.afterRender.map(fn => fn(config, assets))
  const ret = results.reduce(
    (previous, current) => {
      return {
        head: previous.head + dynamicHeadToString(current.head),
        footer: previous.footer + (current.footer || '')
      }
    },
    { head: '', footer: '' }
  )
  return ret
}

const renderGet = async (req, res, settings) => {
  try {
    const eventcollector = init(req)
    const routeResult = await strategy.router(req, config)
    const { redirectLocation, route, routeComponent } = routeResult
    if (redirectLocation) {
      return redirect(res, redirectLocation)
    } else if (!routeComponent) {
      return notfound(res)
    }
    const getStatePromise = strategy.getStatePromise(
      req,
      config,
      route,
      routeComponent
    )
    res.statusCode = 200
    sendInitialHeaders(res, assets)
    //sendHeaders(matchUrl(res, serverConfig.headers));
    res.write('<!DOCTYPE html><html><head>')
    //sendStaticHead(res, serverConfig.staticHead);
    sendHeadAssets(res, assets)
    sendSettings(res, settings)
    if (res.flush) {
      res.flush()
    }
    const state = await getStatePromise
    if (state && state.json) {
      res.write(
        `<script>window.__INITIALSTATE__ = ${JSON.stringify(
          state.json
        )};</script>`
      )
      //if(serverConfig.renderHead) {
      //    sendDynamicHead(res, serverConfig.renderHead(req, state.json));
      //}
    }
    if (req.userInfo) {
      res.write(
        `<script>window.__USER_INFO__ = ${JSON.stringify(
          req.userInfo
        )};</script>`
      )
    }
    if (strategy.render.canStream && strategy.render.canStream()) {
      res.write('</head><body><div id="root">')
      //stream the things
      res.write('</div>')
      const { footer } = afterRender(assets)
      res.write(`</head><body><div id="root">${html}</div>`)
      if (footer) {
        res.write(footer)
      }
    } else {
      let html
      if (state && state.html) {
        html = state.html
      } else {
        const renderComponent = strategy.wrapInStoreHoC
          ? strategy.wrapInStoreHoC(state.json, routeComponent)
          : routeComponent
        html = await strategy.render(renderComponent)
      }
      const { head, footer } = afterRender(assets)
      if (head) {
        res.write(head)
      }
      res.write(`</head><body><div id="root">${html}</div>`)
      if (footer) {
        res.write(footer)
      }
    }
    res.write('</body></html>')
    res.end()
  } catch (e) {
    console.log('Uhoh!', e)
  }
}

const isReusable = true

const doGeoLookup = () => config.requestExtendedUserInfo

export { renderGet, isReusable, doGeoLookup }
