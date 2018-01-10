import { parse as parseUrl } from 'url'
import { parse as parseQs } from 'querystring'
import buildInfo from 'next-build-info'

const render = require('./render').default

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

const renderGet = async (req, res, settings) => {
  const { status, path, query, page } = route(req)
  try {
    res.statusCode = status
    const html = await render(req, res, path, query, {
      page,
      buildInfo,
      settings
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
