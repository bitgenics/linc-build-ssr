const clientImportFragment = `import { Provider } from 'react-redux'`

const preRenderFragment = (renderComponent, store) =>
  `${renderComponent} = <Provider store={${store}}>{${renderComponent}}</Provider>`

export { clientImportFragment, preRenderFragment }
