const clientImportFragment = `import React from 'react'
import { render } from 'react-dom'`

const renderFragment = (renderComponent, rootId) =>
  `render(${renderComponent}, document.getElementById('${rootId}'))`

const webpackConfig = distDir => {
  return {
    server: {
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
