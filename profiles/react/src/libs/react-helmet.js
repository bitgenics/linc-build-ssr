import helmet from 'react-helmet'

const afterRendersFn = (req, config, assets) => {
  return { head: helmet.renderStatic() }
}

const afterRenders = {
  fn: afterRenderFn
}

export { afterRenders }
