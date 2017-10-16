const clientImportFragment = `import React from 'react'
import { hydrate } from 'react-dom'`

const renderFragment = (renderComponent, rootId) =>
  `hydrate(${renderComponent}, document.getElementById('${rootId}'))`

export { clientImportFragment, renderFragment }
