import React from 'react'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

const preRendersFn = (req, renderComponent, state) => {
  const sheet = new ServerStyleSheet()
  req.styledcomponents = { sheet }
  return (
    <StyleSheetManager sheet={sheet.instance}>
      {renderComponent}
    </StyleSheetManager>
  )
}

const afterRendersFn = (req, config, assets) => {
  const styleTags = req.styledcomponents.sheet.getStyleTags()
  return { head: { style: styleTags } }
}

const preRenders = {
  fn: preRendersFn
}

const afterRenders = {
  fn: afterRendersFn
}

export { preRenders, afterRenders }
