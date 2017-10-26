const clientImportFragment = `import { Provider } from 'react-redux'`

const wrapInStoreHoCFragment = (renderComponent, store, routeComponent) =>
  `const ${renderComponent} = <Provider store={${store}}>{${routeComponent}}</Provider>`

export { clientImportFragment, wrapInStoreHoCFragment }
