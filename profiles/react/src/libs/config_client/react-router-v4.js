const configFragment = {
  imports: [`import App from './App';`],
  values: {
    root: {
      example: '<App/>',
      required: true,
      comment: 'Your root application component'
    }
  }
}

const clientImportFragment = `import BrowserRouter from 'react-router-dom/BrowserRouter'`

const routerFragment = (routeComponent, history) =>
  `
const ${routeComponent} = <BrowserRouter>{config.root}</BrowserRouter>`


export { configFragment, clientImportFragment, routerFragment }
