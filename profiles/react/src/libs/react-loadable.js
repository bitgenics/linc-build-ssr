import React from 'react'
import Loadable from 'react-loadable'
import stats from 'reactloadable'

function getBundles(manifest, moduleIds) {
  return moduleIds.reduce((bundles, moduleId) => {
    return bundles.concat(manifest[moduleId])
  }, [])
}

const initsFn = () => {
  console.log('PRELOAD')
  return Loadable.preloadAll()
}

const preRendersFn = (req, renderComponent, state) => {
  console.log('PRERENDER')
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
  console.log('AFTERRENDER')
  console.log('loaded_modules', req.linc.loaded_modules)
  const bundles = getBundles(stats, req.linc.loaded_modules)
  console.log('bundles', bundles)
  const scriptList = bundles.filter(bundle => bundle.file.endsWith('.js'))
  const scripts = scriptList.map(script => {
    return { src: `/${script.file}` }
  })
  console.log('scripts', scripts)
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
