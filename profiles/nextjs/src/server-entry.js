import crypto from 'crypto'
import { parse as parseUrl } from 'url'
import { parse as parseQs } from 'querystring'
import buildInfo from 'next-build-info'

const render = require('./render').default
let config = {}
try {
  config = require('linc-server-config')
  console.log('Using custom server configuration')
} catch (e) {}

const dashify = str => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

const generateCSP = cfg => {
  if (!cfg) {
    return null
  }

  const directives = {}
  for (const directive in cfg) {
    directives[dashify(directive)] = cfg[directive]
  }
 
  directives['script-src'] = `${directives['script-src'] ||
    ''} 'unsafe-inline' 'nonce-__NONCE__'`
  directives['style-src'] = `${directives['style-src'] || ''} 'unsafe-inline'` // 'nonce-__NONCE__'

  return Object.keys(directives)
    .reduce((result, key) => {
      return result.concat(`${key} ${directives[key]}`)
    }, [])
    .join('; ')
}

const cspConfig = config.headers && config.headers.csp
const cspHeader = cspConfig ? generateCSP(cspConfig) : null
const cspReportConfig = config.headers && config.headers.cspReport
const cspReportHeader = cspReportConfig ? generateCSP(cspReportConfig) : null

const route = req => {
  const parsedUrl = parseUrl(req.url, true)

  if (typeof parsedUrl.query === 'string') {
    parsedUrl.query = parseQs(parsedUrl.query)
  }
  let page = parsedUrl.pathname
  if (page.endsWith('/')) {
    page = page + 'index.js'
  }
  if (!page.endsWith('.js') || page.endsWith('.json')) {
    page = page + '.js'
  }

  let status = 200
  if (!buildInfo.pages[page]) {
    status = 404
    page = '/_error.js'
  }
  return { page, status, path: parsedUrl.pathname, query: parsedUrl.query }
}

const getNonce = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        reject(err)
      } else {
        resolve(buf.toString('base64'))
      }
    })
  })
}

const sendHeaders = (req, res, nonce, env = 'prod') => {
  if (cspHeader && env !== 'local') {
    res.setHeader(
      'Content-Security-Policy',
      cspHeader.replace(/__NONCE__/g, nonce)
    )
  }
  if (cspReportHeader) {
    res.setHeader(
      'Content-Security-Policy-Report',
      cspReportHeader.replace(/__NONCE__/g, nonce)
    )
  }
  const configHeaders = config.headers || {}
  const staticHeaders = configHeaders.static || []
  for(let header of staticHeaders) {
    res.setHeader(header.name, header.value)
  }
  const dynamicHeaders = configHeaders.dynamic ? configHeaders.dynamic(req) : []
  for(let header of dynamicHeaders) {
    res.setHeader(header.name, header.value)
  }
  if (!env.startsWith('prod') && !env.startsWith('local')) {
    res.setHeader('X-Robots-Tag', 'none')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
}

const renderGet = async (req, res, settings, env = 'prod') => {
  try {
    const nonce = await getNonce()
    sendHeaders(req, res, nonce, env)
    const { status, path, query, page } = route(req)
    res.statusCode = status
    const html = await render(req, res, path, query, {
      page,
      buildInfo,
      settings,
      nonce
    })
    res.end(html)
  } catch (err) {
    console.log('Error', err)
    res.statusCode = 500
    try {
      const html = await render(req, res, path, query, {
        err,
        page: '/_error.js',
        buildInfo,
        settings
      })
      res.end(html)
    } catch (err2) {
      res.end('An unknown server error happened.')
    }
  }
}

const isReusable = true
const doGeoLookup = false

export { renderGet, isReusable, doGeoLookup }
