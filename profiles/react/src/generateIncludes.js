const path = require('path')
const fse = require('fs-extra')

const createIncludes = files => {
  const buildUrls = () =>
    files.reduce((str, file) => {
      return str.concat(
        `urls['/${path.basename(file)}'] = require('raw-loader!${file}')\n`
      )
    }, '')
  return `const urls = {}
${buildUrls()}
module.exports = (url) => urls[url]
`
}

const generateIncludes = async (dest, src) => {
  const list = await fse.readdir(src)
  const filtered = list.filter(file =>
    ['.js', '.txt'].includes(path.extname(file))
  )
  const files = filtered.map(file => path.resolve(src, file))
  const code = createIncludes(files)
  return fse.writeFile(dest, code)
}

module.exports = generateIncludes
