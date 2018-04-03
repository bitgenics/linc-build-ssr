const path = require('path')
const util = require('util')
const cheerio = require('cheerio')
const fse = require('fs-extra')
const globby = require('globby')
const compiler = require('marko/compiler')

const compile = util.promisify(compiler.compile)

const createCode = contents => {
  let code = 'const urls = {}\n'
  Object.keys(contents).forEach(url => {
    code = code.concat(`urls['/${url}'] = ${contents[url]}\n`)
  })
  code = code.concat('module.exports = urls')
  return code
}

const initCode =
  'var ENV_SETTINGS = ${JSON.stringify(input.settings)};\n' +
  'window.EnvSettings = ENV_SETTINGS;\n' +
  "var CSP_NONCE = '${input.nonce}';\n" +
  'window.CspNonce = CSP_NONCE;\n'

const getJSPath = file => {
  const filename = `${path.basename(file, '.html')}.js`
  return path.join(path.dirname(file), filename)
}

const processHtml = async (file, src, dest) => {
  const pathname = getJSPath(file)
  const dir = path.join(dest, path.dirname(pathname))
  await fse.ensureDir(dir)
  const html = await fse.readFile(path.resolve(src, file), {
    encoding: 'utf-8'
  })
  const escaped = html.replace(/(\$\{)/g, '\\${')
  const $ = cheerio.load(escaped)
  $('head').prepend(
    `<script type="application/javascript">${initCode}</script>`
  )
  $('script').attr('nonce', '${input.nonce}')
  const js = await compile($.html(), path.resolve(src, file))
  await fse.writeFile(path.resolve(dest, pathname), js)
  return
}

const processHtmls = async (src, dest) => {
  const files = await globby(['**/*.html'], { cwd: src })
  const promises = files.map(async file => {
    await processHtml(file, src, dest)
  })
  await Promise.all(promises)
  return files.reduce((curr, file) => {
    curr[file] = `require('./${getJSPath(file)}')`
    return curr
  }, {})
}

const readNonHtml = async src => {
  const files = await globby(['**/*', '!**/*.html'], { cwd: src })
  let contents = files.map(file => {
    file = path.join('dist', 'import', file)
    return fse.readFile(file, { encoding: 'base64' })
  })
  contents = await Promise.all(contents)
  const urls = {}
  files.forEach((file, index) => {
    urls[file] = `Buffer.from('${contents[index]}', 'base64')`
  })
  return urls
}

const generateImports = async (src, dest) => {
  const nonHtml = await readNonHtml(src)
  const htmls = await processHtmls(src, path.dirname(dest))
  const contents = Object.assign({}, nonHtml, htmls)
  const code = createCode(contents)
  return fse.writeFile(dest, code)
}

module.exports = generateImports
