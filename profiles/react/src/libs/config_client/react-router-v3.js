const configFragment = {
  imports: [`import routes from './routes';`],
  values: {
    router: {
      routes: {
        example: 'routes',
        required: true,
        comment: 'Your routes definition'
      }
    }
  }
}

const clientImportFragment = `import { Router, browserHistory } from 'react-router'`

const routerFragment = (routeComponent, history) =>
  `
const ${history} = browserHistory
const ${routeComponent} = <Router routes={config.router.routes} history={${history}} />`

export { configFragment, clientImportFragment, routerFragment }
