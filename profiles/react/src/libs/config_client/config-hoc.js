const wrapInStoreHoCFragment = (renderComponent, store, routeComponent) =>
  `const ${renderComponent} = ${routeComponent}`

export { wrapInStoreHoCFragment }
