import statics from 'linc-statics'
const url_parse = require('url').parse
const EventCollector = require('event-collector')
const mime = require('mime-types')

const createConfig = () => {
  let serverConfig = {}
  try {
    serverConfig = require('linc-server-config-js')
    serverConfig = serverConfig.default ? serverConfig.default : serverConfig
  } catch (e) {
    if (e.message.includes('Cannot find module "linc-server-config-js')) {
      console.log(
        "Couldn't find any server-only configuration: 'linc.server.config.js', using defaults"
      )
    } else {
      console.log('Error loading linc.server.config.js', e)
    }
  }

  return serverConfig
}

const initEventCollector = req => {
  const packageJson = require(__dirname + '/../package.json')
  req.eventcollector = req.eventcollector || new EventCollector({})
  req.eventcollector.addMeta({
    renderer: {
      version: packageJson.version,
      profile: packageJson.name
    }
  })
  return req.eventcollector
}

const config = createConfig()

const getPath = url => {
  let pathname = url_parse(url).pathname
  if (pathname.endsWith('/')) {
    pathname += 'index.html'
  }
  return pathname
}

const getContentType = pathname => {
  const mimeType = mime.lookup(pathname)
  return mimeType ? mime.contentType(mimeType) : 'text/html; charset=utf-8'
}

const sendRedirect = (res, location) => {
  res.statusCode = 302
  res.setHeader('Location', location)
  res.end()
}

const renderGet = (req, res, settings) => {
  const eventcollector = initEventCollector(req)
  try {
    const pathname = getPath(req.url)
    if (!statics[pathname] && statics[pathname + '/index.html']) {
      return sendRedirect(res, pathname + '/index.html')
    }
    res.statusCode = 200
    res.setHeader('Content-Type', getContentType(pathname))
    const content = statics[pathname] || statics['/index.html']
    if (content instanceof String || content instanceof Buffer) {
      res.send(content)
    } else if (content.renderToString) {
      const html = content.renderToString({
        settings,
        nonce: 'abcde12345'
      })
      res.send(html)
    } else {
      throw new Error('Unsupported content type')
    }
  } catch (e) {
    eventcollector.addError(e)
    if (!res.headersSent) {
      res.statusCode = 500
    }
  } finally {
    res.end()
  }
}

const isReusable = true
const doGeoLookup = false

export { renderGet, isReusable, doGeoLookup }
