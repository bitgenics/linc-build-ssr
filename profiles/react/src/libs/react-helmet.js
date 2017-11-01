import helmet from 'react-helmet'

const afterRendersFn = (req, config, assets) => {
  return { head: helmet.renderStatic() }
}

const afterRenders = {
  fn: afterRendersFn
}

export { afterRenders }
