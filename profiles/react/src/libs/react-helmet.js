import helmet from 'react-helmet'

const afterRenderFn = (config, assets) => {
  return { head: helmet.renderStatic() }
}

const afterRender = {
  fn: afterRenderFn
}

export { afterRender }
