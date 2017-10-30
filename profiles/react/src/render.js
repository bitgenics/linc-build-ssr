import EventCollector from 'event-collector'
import configFile from 'linc-config-js'
import assets from 'asset-manifest'
import strategy from 'server-strategy'
import includes from 'includes'

const extRegex = /.*?\.(\w*)$/

const createConfig = () => {
  const clientConfig =
    typeof configFile === 'function' ? configFile('server') : configFile
  let serverConfig = {}
  try {
    serverConfig = require('linc-server-config-js')
    serverConfig = serverConfig.default ? serverConfig.default : serverConfig
  } catch (e) {
    if (e.message.includes('Cannot find module "linc-server-config-js')) {
      console.log(
        "Couldn't find any server-only configuration: 'linc.server.config.js'"
      )
    } else {
      console.log('Error loading linc.server.config.js', e)
    }
  }

  return Object.assign({}, clientConfig, serverConfig)
}

const config = createConfig();

const polyfills_io = 'https://cdn.polyfill.io/v2/polyfill.min.js?features='
const polyfillsURL = config.polyfills
  ? `${polyfills_io}${config.polyfills.replace(' ', '')}`
  : null

const initEventCollector = req => {
  const packageJson = require(__dirname + '/../package.json')
  req.eventcollector = req.eventcollector || new EventCollector({})
  req.eventcollector.addMeta({
    rendererVersion: packageJson.version,
    renderProfile: packageJson.name
  })
  if (global.window && window.localStorage) window.localStorage.clear()
  if (global.window && window.sessionStorage) window.sessionStorage.clear()
  return req.eventcollector
}

const redirect = (res, redirectLocation) => {
  res.statusCode = 302
  res.setHeader('Location', redirectLocation.pathname + redirectLocation.search)
  res.end()
}

const notfound = res => {
  res.statusCode = 404
  res.end()
}

const sendIncludes = (res, url) => {
  let type
  const result = url.match(extRegex)
  const ext = result ? result[1] : null
  switch (ext) {
    case 'js':
      type = 'application/javascript'
      break
    case 'txt':
      type = 'text/plain'
      break
  }

  if (type) {
    res.setHeader('Content-Type', type)
  }
  const include = includes(url)
  res.send(include)
}

const inits = (req) => {
  const promises = strategy.inits.map((fn) => fn(req))
  return Promise.all(promises)
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
  // Prevent an empty <script> tag in the rendered HTML
  if (!Object.keys(settings).length) return

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

const sendConfigStaticHead = (req, res) => {
  if (config.getStaticHead) {
    res.write(config.getStaticHead(req))
  }
}

const sendConfigDynamicHead = (req, state, res) => {
  if (config.getDynamicHead) {
    res.write(config.getDynamicHead(req, state))
  }
}

const sendState = (req, state, res) => {
  if (state.json) {
    res.write(
      `<script>window.__INITIALSTATE__ = ${JSON.stringify(
        state.json
      )};</script>`
    )
  }
  if (req.userInfo) {
    res.write(
      `<script>window.__USER_INFO__ = ${JSON.stringify(req.userInfo)};</script>`
    )
  }
}

const afterRender = (req, assets) => {
  const results = strategy.afterRenders.map(fn => fn(req, config, assets))
  const ret = results.reduce(
    (previous, current) => {
      return {
        head: previous.head + dynamicHeadToString(current.head),
        trailer: previous.trailer + (current.trailer || '')
      }
    },
    { head: '', trailer: '' }
  )
  return ret
}

const renderHTML = (html, req, res) => {
  const { head, trailer } = afterRender(req, assets)
  if (head) {
    res.write(head)
  }
  res.write(`</head><body><div id="root">${html}</div>`)
  if (trailer) {
    res.write(trailer)
  }
}

const getRenderComponent = (req, routeComponent, state) => {
  return strategy.preRenders.reduce((renderComponent, fn) => {
    const retval = fn(req, renderComponent, state)
    return retval
  }, routeComponent)
}

const renderToString = async (req, routeComponent, state, res) => {
  const renderComponent = getRenderComponent(req, routeComponent, state.json)
  const html = await strategy.render(renderComponent)
  renderHTML(html, req, res)
}

const renderToStream = async (routeComponent, res) => {
  console.log('Not Yet Implemented')
}

const sendConfigTrailer = (req, state, res) => {
  if (config.getTrailer) {
    res.write(config.getTrailer(req))
  }
}

const renderGet = async (req, res, settings) => {
  try {
    const eventcollector = initEventCollector(req)
    const getJob = eventcollector.startJob('renderGet')
    const url = req.url
    if (url.length > 1 && !(url.lastIndexOf('/') > 1) && includes(url)) {
      eventcollector.endJob(getJob)
      return sendIncludes(res, url)
    }
    
    eventcollector.addMeta({ strategy: strategy.strategy })
    await inits(req)

    const routeJob = eventcollector.startJob('routing')
    const routeResult = await strategy.router(req, config)
    const { redirectLocation, route, routeComponent } = routeResult
    if (redirectLocation) {
      return redirect(res, redirectLocation)
    } else if (!routeComponent) {
      return notfound(res)
    }
    eventcollector.endJob(routeJob)
    const stateJob = req.eventcollector.startJob('getState')
    const getStatePromise = strategy.getStatePromise(
      req,
      config,
      route,
      routeComponent
    )
    res.statusCode = 200
    sendInitialHeaders(res, assets)
    res.write('<!DOCTYPE html><html><head>')
    sendHeadAssets(res, assets)
    sendConfigStaticHead(req, res)
    sendSettings(res, settings)
    if (res.flush) {
      res.flush()
    }
    const state = (await getStatePromise) || {}
    eventcollector.endJob(stateJob)
    sendConfigDynamicHead(req, state, res)
    sendState(req, state, res)
    const renderJob = eventcollector.startJob('render')
    let renderMethod
    if (state.html) {
      renderMethod = 'static'
      renderHTML(state.html, req, res)
    } else if (strategy.render.canStream && strategy.render.canStream()) {
      renderMethod = 'renderToStream'
      await renderToStream(req, routeComponent, state, res)
    } else {
      renderMethod = 'renderToString'
      await renderToString(req, routeComponent, state, res)
    }
    eventcollector.endJob(renderJob, { renderMethod })

    if (polyfillsURL) {
      res.write(`<script src="${polyfillsURL}"></script>`)
    }
    res.write(`<script src="/${assets['vendor.js']}"></script>`)
    res.write(`<script src="/${assets['main.js']}"></script>`)
    sendConfigTrailer(req, state, res)
    res.write('</body></html>')
    res.end()
    eventcollector.endJob(getJob)
  } catch (e) {
    console.log('Uhoh!', e)
    req.eventcollector.addError(e)
  }
}

const isReusable = true

const doGeoLookup = () => config.requestExtendedUserInfo

export { renderGet, isReusable, doGeoLookup }
