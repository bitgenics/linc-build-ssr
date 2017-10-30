import Loadable from 'react-loadable'

const initsFn = () => {
	return Loadable.preloadAll()
}

const preRendersFn = (req, renderComponent, state ) => {
  req.linc = req.linc || {}
  req.linc.loaded_modules = []
  return <Loadable.Capture report={moduleName => req.linc.loaded_modules.push(moduleName)}>{renderComponent}</Loadable.Capture>
}

const afterRendersFn = (req, config, assets) => {
  console.log('Modules', req.linc.loaded_modules)
  return {}
}

const inits = {
  fn: initsFn
}

const preRenders = {
  fn: preRendersFn
}

const afterRenders = {
  fn: afterRendersFn
}

export { inits, preRenders, afterRenders }
