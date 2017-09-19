import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';

const clientImportFragment = `
import { Provider } from 'react-redux'
`

const clientCodeFragment = (store, routeComponent, renderComponent) => `
const ${renderComponent} = <Provider store={${store}}>${routeComponent}</Provider>
`

const wrapInStoreHoCFn = (state, routeComponent) => {
    const ignoreMiddleware = store => next => action => {
        next({type: 'ToIgnore'});
    }
    const store = createStore((s) => s, state, applyMiddleware(ignoreMiddleware));
    return (
        <Provider store={store}>
            {routeComponent}
        </Provider>
    );
}

const wrapInStoreHoC = {
	fn: wrapInStoreHoCFn,
    clientImportFragment,
    clientCodeFragment
}

export { wrapInStoreHoC }