const configFragment = {
    imports: [
        `import routes from './routes';`
    ],
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

const clientImportFragment = `import { Router } from 'react-router'`

const routerFragment = (routeComponent, history) => `
const ${routeComponent} = <Router routes={config.router.routes} history={${history}} />
`
export {configFragment, clientImportFragment, routerFragment}