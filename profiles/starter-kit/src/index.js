const webpack = require('webpack')

const server_config = require('./webpack.config.server.js')

const build_client = async () => {}

const build_server = async () => {
  return new Promise((resolve, reject) => {
    const config = server_config({})
    webpack(config, (err, stats) => {
      if (err) return reject(err)
      const errors = stats.toJson('errors-only').errors.toString()
      if (errors) return reject(errors)
      resolve()
    })
  })
}

module.exports = async callback => {
  try {
    await build_client()
    await build_server()
    callback()
  } catch (e) {
    callback(e)
  }
}
