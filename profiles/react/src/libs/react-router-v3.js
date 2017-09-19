import { match as matchRoute, RouterContext, createMemoryHistory } from 'react-router';

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

const clientImportFragment = `
import { Router } from 'react-router'
`

const clientCodeFragment = (routeComponent) => `
const ${routeComponent} = <Router routes={config.router.routes} history={env.history} />
`

const matchFn = (req, config) => {
    return new Promise((resolve, reject) => {
        matchRoute({ routes: config.router.routes, location: req.url }, (err, redirectLocation, renderProps) => {
            if(err) { return reject(err); }
            resolve( {
                redirectLocation, 
                route: renderProps, 
                routeComponent: <RouterContext {...renderProps} />
            });
        });
    });
}

const match = {
	fn: matchFn,
    clientImportFragment,
    clientCodeFragment
}

export { match, configFragment };