const configFragment = {
  imports: [`import routes from './routes';`],
  values: {
    root: {
      example: 'routes',
      required: true,
      comment: 'Your routes definition'
    }
  }
}

const routerFragment = (routeComponent, history) =>
  `const ${routeComponent} = config.root`

export { configFragment, routerFragment }
