import { match as matchRoute, RouterContext, createMemoryHistory } from 'react-router';

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
	fn: matchFn
}

export { match };