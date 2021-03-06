const configFragment = {
  imports: [`import createStore from './store'`],
  values: {
    state: {
      createStore: {
        default: 'createStore',
        required: false,
        comment: 'Method to create store. Takes an optional initialState'
      }
    }
  }
}

const createStoreFragment = (store, initialState) => `
const ${store} = config.state && config.state.createStore && config.state.createStore(${initialState});
`

export { configFragment, createStoreFragment }
