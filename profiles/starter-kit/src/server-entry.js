import configFile from 'linc-config-js'

const createConfig = () => {
  const clientConfig =
    typeof configFile === 'function' ? configFile('server') : configFile
  let serverConfig = {}
  try {
    serverConfig = require('linc-server-config-js')
    serverConfig = serverConfig.default ? serverConfig.default : serverConfig
  } catch (e) {
    if (e.message.includes('Cannot find module "linc-server-config-js')) {
      console.log(
        "Couldn't find any server-only configuration: 'linc.server.config.js', using defaults"
      )
    } else {
      console.log('Error loading linc.server.config.js', e)
    }
  }

  return Object.assign({}, clientConfig, serverConfig)
}

const config = createConfig()

const renderGet = async (req, res, settings) => {
  const message = config.message || 'Hello World!'
  res.end(message)
}

const isReusable = true
const doGeoLookup = false

export { renderGet, isReusable, doGeoLookup }
