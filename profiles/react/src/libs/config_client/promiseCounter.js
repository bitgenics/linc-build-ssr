const configFragment = {
  imports: [
    `import reducer from './reducers';`,
    `import thunk from 'redux-thunk';`
  ],
  values: {
    redux: {
      reducer: {
        default: 'reducer',
        required: true,
        comment: 'Your root reducer'
      },
      initialState: {
        default: '{}',
        required: false,
        comment: 'Any initial state you want to pass on server & client'
      },
      middleware: {
        default: '[]',
        example: '[ thunk ]',
        required: false,
        comment: 'Any middleware you want to add to the store'
      },
      enhancers: {
        default: '[]',
        required: false,
        comment: 'Any enhancers you want to add to the store'
      },
      parseServerState: {
        example: 'serverState => serverState',
        required: false,
        commented: true,
        comment:
          'A method to use to parse the JSON state the server sent. Used for things like Immutable.js'
      }
    }
  }
}

const clientImportFragment = `import { createStore, applyMiddleware, compose } from 'redux'`

const createStoreFragment = (store, initialState) => `
const configMiddleware = config.redux.middleware || [];
const enhancer = config.redux.enhancers ? 
		compose(applyMiddleware(...configMiddleware), ...config.redux.enhancers) :
		applyMiddleware(...configMiddleware);

const ${store} = createStore(
	config.redux.reducer,
	${initialState},
	enhancer
);
`
export { configFragment, clientImportFragment, createStoreFragment }
