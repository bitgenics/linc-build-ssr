import { createElement } from 'react'
import { renderToString, renderToStaticMarkup } from 'react-dom/server.browser'
import { Router } from 'next/dist/lib/router'
import { loadGetInitialProps } from 'next/dist/lib/utils'
import Head, { defaultHead } from 'next/dist/lib/head'
import App from 'next/dist/lib/app'
import { flushChunks } from 'next/dist/lib/dynamic'

async function render (req, res, pathname, query, {
  err,
  page,
  buildInfo,
  settings,
  assetPrefix = '/_assets',
} = {}) {

  let Component = buildInfo.pages[page]
  let Document = buildInfo.pages['/_document.js']

  Component = Component.default || Component
  Document = Document.default || Document

  const asPath = req.url
  const ctx = { err, req, res, pathname, query, asPath }
  const props = await loadGetInitialProps(Component, ctx)

  // the response might be finshed on the getinitialprops call
  if (res.finished) return

  const renderPage = (enhancer = Page => Page) => {
    const app = createElement(App, {
      Component: enhancer(Component),
      props,
      router: new Router(pathname, query, asPath)
    })

    let html
    let head
    let errorHtml = ''

    try {
      if (err) {
        errorHtml = renderToString(app)
      } else {
        html = renderToString(app)
      }
    } finally {
      head = Head.rewind() || defaultHead()
    }
    const chunks = loadChunks({ availableChunks: buildInfo.chunks })

    return { html, head, errorHtml, chunks }
  }

  const docProps = await loadGetInitialProps(Document, { ...ctx, renderPage, settings })

  if (res.finished) return

  if (!Document.prototype || !Document.prototype.isReactComponent) throw new Error('_document.js is not exporting a React element')
  const doc = createElement(Document, {
    __NEXT_DATA__: {
      props,
      pathname,
      query,
      buildId: buildInfo.buildId,
      buildStats: buildInfo.buildStats,
      assetPrefix,
      nextExport: false,
      err: (err) ? { message: '500 - Internal Server Error.' } : null
    },
    dev: false,
    dir: '.',
    staticMarkup: false,
    ...docProps
  })

  return '<!DOCTYPE html>' + renderToStaticMarkup(doc)
}

function loadChunks ({ availableChunks }) {

  const flushedChunks = flushChunks()
  const validChunks = []

  for (var chunk of flushedChunks) {
    if (availableChunks[chunk]) {
      validChunks.push(chunk)
    }
  }

  return validChunks
}

export default render