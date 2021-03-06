const clientImportFragment = `import React from 'react'
import { hydrate } from 'react-dom'`

const renderFragment = (renderComponent, rootId) =>
  `hydrate(${renderComponent}, document.getElementById('${rootId}'))`

const webpackConfig = distDir => {
  return {
    server: {
      alias: {
        'reactdom/server': 'reactdom/server.browser'
      },
      babel: {
        presets: ['babel-preset-react']
      }
    },
    client: {
      babel: {
        presets: ['babel-preset-react']
      }
    }
  }
}

export { clientImportFragment, renderFragment, webpackConfig }
