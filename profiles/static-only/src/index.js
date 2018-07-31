const cp = require('child_process')
const path = require('path')

const cachebust = require('@bitgenics/cachebust')
const fse = require('fs-extra')
const webpack = require('webpack')

const generateImports = require('./generateImports')

const pkgJson = require(path.join(process.cwd(), 'package.json'))

const server_config = require('./webpack.config.server.js')

const spawn = async (cmd, args, options) => {
  return new Promise((resolve, reject) => {
    const sp = cp.spawn(cmd, args, options)
    sp.on('close', code => {
      if (code) {
        reject(code)
      } else {
        resolve()
      }
    })
  })
}

const build_client = async () => {
  console.log('Cleaning dist directory')
  await fse.remove('./dist')
  if (pkgJson.scripts && pkgJson.scripts.clean) {
    console.log('Running npm run clean')
    await spawn('npm', ['run', 'clean'])
  }
  if (!await fse.exists('./node_modules')) {
    console.log('Running `npm install`')
    await spawn('npm', ['install'])
  }
  console.log('Running `npm run build`')
  const err = await spawn('npm', ['run', 'build'])
  await fse.ensureDir('./dist')
  await fse.move('./build', './dist/import')
  console.log('Preparing static assets for deployment to CDN')
  const report = await cachebust({
    distDir: './dist/import',
    currentPrefix: 'static',
    targetPrefix: '/_assets',
    staticDest: './dist/static',
    overwrite: true,
    hash: false
  })
}

const build_server = async () => {
  await fse.ensureDir('./dist/tmp')
  await generateImports('./dist/import', './dist/tmp/_linc_imports.js')
  return new Promise((resolve, reject) => {
    webpack(server_config, (err, stats) => {
      if (err) return reject(err)
      const errors = stats.toJson('errors-only').errors.toString()
      if (errors) return reject(errors)
      resolve()
    })
  })
}

module.exports = async (opts, callback) => {
  if (!callback) {
    callback = opts
  }
  try {
    await build_client()
    console.log('Creating server bundle')
    await build_server()
    callback()
  } catch (e) {
    callback(e)
  }
}
