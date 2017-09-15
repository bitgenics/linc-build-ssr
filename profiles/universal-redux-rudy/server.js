import React from 'react'
import ReactDOM from 'react-dom/server'
import { Provider } from 'react-redux'
import { flushChunkNames } from 'react-universal-component/server'
import flushChunks from 'webpack-flush-chunks'
import createHistory from 'history/createMemoryHistory'
import { NOT_FOUND } from 'redux-first-router'
import stats from 'stats'
import config from 'linc-config-js'
import { findVideos, findVideo } from 'api'

const createStore = async (req, res) => {
  const jwToken = req.cookies ? req.cookies.jwToken : {} // see server/index.js to change jwToken
  const preLoadedState = { jwToken } // onBeforeChange will authenticate using this

  const history = createHistory({ initialEntries: [req.path] })
  const { store, thunk } = config.redux.configureStore(history, preLoadedState)

  // if not using onBeforeChange + jwTokens, you can also async authenticate
  // here against your db (i.e. using req.cookies.sessionId)

  let location = store.getState().location
  if (doesRedirect(location, res)) return false

  // using redux-thunk perhaps request and dispatch some app-wide state as well, e.g:
  // await Promise.all([store.dispatch(myThunkA), store.dispatch(myThunkB)])

  await thunk(store) // THE PAYOFF BABY!

  location = store.getState().location // remember: state has now changed
  if (doesRedirect(location, res)) return false // only do this again if ur thunks have redirects

  const status = location.type === NOT_FOUND ? 404 : 200
  res.status(status)
  return store
}

const doesRedirect = ({ kind, pathname }, res) => {
  if (kind === 'redirect') {
    res.redirect(302, pathname)
    return true
  }
}

const handleApiRequest = async (req, res) => {
  const jwToken = 'fake'
  if(req.url.startsWith('/api/videos/')) {
    const category = req.url.substring(12);
    console.log('Category', category);
    const data = await findVideos(category, jwToken)
    res.json(data)
  } else {
    const slug = req.url.substring(11);
    console.log('Slug', slug)
    const data = await findVideo(slug, jwToken)
    res.json(data)
  }
  
}

const renderGet = async (req, res, settings) => {

  if(req.url.startsWith('/api')) {
    await handleApiRequest(req, res);
    return;
  }

  const store = await createStore(req, res)
  if (!store) return // no store means redirect was already served

  const app = createApp(config.app, store)
  const appString = ReactDOM.renderToString(app)
  const stateJson = JSON.stringify(store.getState())
  const chunkNames = flushChunkNames()
  const { js, styles, cssHash } = flushChunks(stats, { chunkNames })

  console.log('REQUESTED PATH:', req.path)
  console.log('CHUNK NAMES', chunkNames)
  return res.send(
    `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>redux-first-router-demo</title>
          ${styles}
          <link rel="stylesheet" href="http://code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css">
        </head>
        <body>
          <script>window.REDUX_STATE = ${stateJson}</script>
          <div id="root">${appString}</div>
          ${cssHash}
          ${js}
        </body>
      </html>`
  )
}

const createApp = (App, store) =>
  <Provider store={store}>
    <App />
  </Provider>

const isReusable = true;

export {renderGet, isReusable}