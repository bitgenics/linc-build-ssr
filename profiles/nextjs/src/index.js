const path = require('path')
const fse = require('fs-extra')
const glob = require('glob')
const webpack = require('webpack')

const server_config = require('./webpack.config.server.js')
const next_build = require(`${process.cwd()}/node_modules/next/dist/server/build`)
  .default

const nextDir = path.resolve('./.next')
const nextDistDir = path.join(nextDir, 'dist')
const lincDir = path.resolve('./dist')
const lincStaticDir = path.join(lincDir, 'static')

const buildStats = require(path.join(nextDir, 'build-stats.json'))

const nextConfig = {
  assetPrefix: '/_assets',
  webpack: config => {
    config.output.publicPath = `/_assets${config.output.publicPath}`
    return config
  }
}

const copy = async (src, dest) => {
  if (await fse.pathExists(src)) {
    await fse.ensureDir(path.dirname(dest))
    await fse.copy(src, dest)
  }
}

const copyNextFiles = async () => {
  const nextFilesDir = path.join(lincStaticDir, nextConfig.assetPrefix, '_next')
  if (!await fse.pathExists(nextDir)) {
    console.log(`Directory: ${fromDir} does not exist`)
  }
  await fse.ensureDir(nextFilesDir)
  const buildId = await fse.readFile(path.join(nextDir, 'BUILD_ID'), 'utf-8')
  const buildIdDir = path.join(nextFilesDir, buildId)
  copy(path.join(nextDistDir, 'chunk'), path.join(buildIdDir, 'webpack'))
  for (file in buildStats) {
    copy(
      path.join(nextDir, file),
      path.join(nextFilesDir, buildStats[file].hash, file)
    )
  }
  copy(path.join(nextDir, 'bundles', 'pages'), path.join(nextFilesDir, buildId, 'page'))
}

const copyStaticFiles = async () => {
  copy(path.resolve('.', 'static'), path.join(lincStaticDir, 'static'))
}

const createBuildInfoFile = async dest => {
  const pagesDir = path.join(path.resolve(nextDistDir), 'pages')
  const pageFiles = glob.sync(`${pagesDir}/**/*.js`)
  const pages = pageFiles.map(
    file => `pages['/${path.relative(pagesDir, file)}'] = require('${file}')`
  )

  const buildId = await fse.readFile(path.join(nextDir, 'BUILD_ID'), 'utf-8')
  
  const chunkDir = path.join(nextDistDir, 'chunk')
  const chunkFiles = glob.sync(`${chunkDir}/**/*.js`)
  const chunks = chunkFiles.map(
    file => `chunks['${path.basename(file)}'] = true`
  )
  
  const file = `
const buildId = '${buildId}'

const buildStats = ${JSON.stringify(buildStats)}

const chunks = {}
${chunks.join('\n')}

const pages = {}
${pages.join('\n')}

module.exports = {buildId, pages, chunks, buildStats}`
  await fse.writeFile(dest, file)
}

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

const build_client = async () => {
  await fse.remove('./.next')
  await fse.remove('./dist')
  await next_build('.', nextConfig)
  await copyNextFiles()
  await copyStaticFiles()
}

module.exports = async callback => {
  try {
    await build_client()
    await createBuildInfoFile(path.join(lincDir, 'build_info.js'))
    await build_server()
    callback()
  } catch (e) {
    callback(e)
  }
}
