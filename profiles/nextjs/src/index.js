const path = require('path')
const fse = require('fs-extra')
const glob = require('glob')
const webpack = require('webpack')
const cachebust = require('@bitgenics/cachebust')

const server_config = require('./webpack.config.server.js')
const next_build = require(`${process.cwd()}/node_modules/next/dist/server/build`)
  .default

const nextDir = path.resolve('./.next')
const nextDistDir = path.join(nextDir, 'dist')
const nextStaticDir = path.resolve('./static')
const lincDir = path.resolve('./dist')
const lincStaticDir = path.join(lincDir, 'static')

process.env.NODE_ENV = 'production'

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

const copyNextFiles = async buildStats => {
  const nextFilesDir = path.join(lincStaticDir, nextConfig.assetPrefix, '_next')
  if (!await fse.pathExists(nextDir)) {
    console.log(`Directory: ${fromDir} does not exist`)
  }
  await fse.ensureDir(nextFilesDir)
  const buildId = await fse.readFile(path.join(nextDir, 'BUILD_ID'), 'utf-8')
  const buildIdDir = path.join(nextFilesDir, buildId)
  copy(path.join(nextDistDir, 'chunk'), path.join(buildIdDir, 'webpack'))
  for (const file in buildStats) {
    copy(
      path.join(nextDir, file),
      path.join(nextFilesDir, buildStats[file].hash, file)
    )
  }
  copy(
    path.join(nextDir, 'bundles', 'pages'),
    path.join(nextFilesDir, buildId, 'page')
  )
}

const createBuildInfoFile = async (dest, buildStats) => {
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

const cachebust_static = async () => {
  const tmpStaticDir = path.resolve('./.next/static')
  const results = await cachebust({
    distDir: './.next',
    staticSrc: nextStaticDir,
    currentPrefix: 'static',
    targetPrefix: '/_assets',
    staticDest: tmpStaticDir,
    moveRootFiles: true,
    overwrite: false
  })
  fse.writeFile(
    path.join(lincDir, 'cachebust-report.json'),
    JSON.stringify(results, null, 4)
  )
  copy(tmpStaticDir, lincStaticDir)
}

const build_client = async () => {
  await next_build('.', nextConfig)
  if (fse.pathExistsSync(nextStaticDir)) {
    await cachebust_static()
  }
  return require(path.join(nextDir, 'build-stats.json'))
}

module.exports = async callback => {
  try {
    await fse.remove('./.next')
    await fse.remove('./dist')
    await fse.ensureDir(lincDir)
    const buildStats = await build_client()
    await copyNextFiles(buildStats)
    await createBuildInfoFile(path.join(lincDir, 'build_info.js'), buildStats)
    await build_server()
    callback()
  } catch (e) {
    console.log(e)
    callback(e)
  }
}
