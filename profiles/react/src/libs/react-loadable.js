import React from 'react'
import Loadable from 'react-loadable'
import { getBundles } from 'react-loadable/webpack'
import stats from 'reactloadable'

const initsFn = () => {
  return Loadable.preloadAll()
}

const preRendersFn = (req, renderComponent, state) => {
  req.linc = req.linc || {}
  req.linc.loaded_modules = []
  return (
    <Loadable.Capture
      report={moduleName => req.linc.loaded_modules.push(moduleName)}>
      {renderComponent}
    </Loadable.Capture>
  )
}

const afterRendersFn = (req, config, assets) => {
  const bundles = getBundles(stats, req.linc.loaded_modules)
  const scriptList = bundles.filter(bundle => bundle.file.endsWith('.js'))
  const scripts = scriptList.map(script => {
    return { src: `/${script.file}` }
  })
  return { trailer: { scripts } }
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
