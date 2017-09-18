const configFragment = {
	imports: [
		`import reducer from './reducers';`,
		`import thunk from 'redux-thunk'`
	],
	values: {
		redux: {
			reducer: {
				example: 'reducer',
				required: true,
				comment: 'Your root reducer'
			},
			initialState: {
				default: '{}',
				required: false,
				comment: 'Any initial state you want to pass on server & client'
			},
			middleware: {
				default: [],
				example: '[ thunk ]',
				required: false,
				comment: 'Any middleware you want to add to the store'
			},
			enhancers: {
				default: [],
				required: false,
				comment: 'Any enhancers you want to add to the store'
			},
			parseServerState: {
				example: 'serverState => serverState',
				required: false,
				comment: 'A method to use to parse the JSON state the server sent. Used for things like Immutable.js'
			}
		}
	}
}

const createStoreFn = (config) => {
	const configMiddleware = config.redux.middleware || [];
	const serverState = (window && window.__INITIALSTATE__) || {};
	const initialState = config.redux.parseServerState ? config.redux.parseServerState(serverState) : serverState;
	const enhancer = config.redux.enhancers ? 
						compose(applyMiddleware(...configMiddleware), ...config.redux.enhancers) :
						applyMiddleware(...configMiddleware);

	return createStore(
	    config.redux.reducer,
	    initialState,
		enhancer
	);

}

const clientImportFragment = `
import { createStore, applyMiddleware, compose } from 'redux'`

const clientCodeFragment = (store) => `
const configMiddleware = config.redux.middleware || [];
const serverState = (window && window.__INITIALSTATE__) || {};
const initialState = config.redux.parseServerState ? config.redux.parseServerState(serverState) : serverState;
const enhancer = config.redux.enhancers ? 
					compose(applyMiddleware(...configMiddleware), ...config.redux.enhancers) :
					applyMiddleware(...configMiddleware);

const ${store} = createStore(
    config.redux.reducer,
    initialState,
	enhancer
);
`

const createStore = {
	fn: createStoreFn,
    clientImportFragment,
    clientCodeFragment
}

export { createStore, configFragment }