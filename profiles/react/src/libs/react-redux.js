import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';

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
}

export { wrapInStoreHoC }