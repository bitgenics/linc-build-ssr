import crypto from 'crypto'
import { parse as parseUrl } from 'url'
import { parse as parseQs } from 'querystring'
import buildInfo from 'next-build-info'

const render = require('./render').default
let serverConfig = {}
try {
  serverConfig = require('linc-server-config')
  console.log('Using custom server configuration')
  console.log(serverConfig)
} catch (e) {}

const generateCSP = (config, report) => {
  const configElem = report ? 'cspReport' : 'csp'
  const directives = config.headers && config.headers[configElem]
  console.log('directives', directives)
  if (!config.headers || !directives) {
    return null
  }

  return Object.keys(directives)
    .reduce((result, key) => {
      result.concat(`${dashify(key)} ${directives[key]}`)
    }, [])
    .join('; ')
}

const dashify = str => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

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

const renderGet = async (req, res, settings) => {
  try {
    const { status, path, query, page } = route(req)
    res.statusCode = status
    const nonce = await getNonce()
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
