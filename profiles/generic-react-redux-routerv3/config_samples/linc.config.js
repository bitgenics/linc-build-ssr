import reducer from './reducers';
import routes from './routes';
import thunk from 'redux-thunk'
import Helmet from 'react-helmet'

//Have any top level css or images? Import them here
//import './index.css';

const config = {
	redux: {
		reducer: reducer,
    //initialState: {}
		middleware: [ thunk ]
    //enhancers: []
    //parseServerState: (serverState) => {
    // If you have any special parsing you need to do of the plain
    // plain JSON Object coming from the server you can do that here.
    // Useful for example for immutable libraries like Immutable.js
    //}
	},
	router: {
		routes: routes	
	},
  head: {
    helmet: Helmet
  }
};

export default config

/*
You are also able supply a function that creates a configuration file. The
single argument is the environment the code is running in: 'CLIENT' or 'SERVER'
*/

/*
import thunk from 'redux-thunk'
import { browserHistory } from 'react-router';
import { routerMiddleware } from 'react-router-redux';
import { persistStore, autoRehydrate } from 'redux-persist';
import localForage from 'localforage';
import rootReducer from './reducer/index';
import routes from './framework/Routes'

const config = (render_env) => {
  const logger = createLogger();
  const router = routerMiddleware(browserHistory);
  
  return {
    redux: {
      reducer: rootReducer,
      middleware: [thunk, router],
      enhancers: render_env === 'CLIENT' && [autoRehydrate()]
    },
    router: {
      routes: routes
    },
    head: {
      helmet: Helmet
    }
    init: (env) => {
      if(render_env === 'CLIENT') {
        const onComplete = () => { console.log("Rehydrate is complete!"); };
        persistStore(env.store, { storage: localForage }, onComplete);
      }
    }
  };
}



export default config
*/