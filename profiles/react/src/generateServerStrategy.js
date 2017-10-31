const path = require('path')
const fs = require('fs-extra')

const mapValues = (obj, iterator) => {
  const keys = Object.keys(obj)
  const mapped = {}
  keys.forEach(key => {
    mapped[key] = iterator(obj[key], key, obj)
  })
  return mapped
}

const createServerStrategyCode = strategy => {
  const variableName = 'strategy'

  const requires = mapValues(strategy, (value, key) => {
    if (key === 'libs') return
    if (typeof value === 'string') {
      const requireFile = path.resolve(__dirname, 'libs', value)
      return `${variableName}['${key}'] = require('${requireFile}').${key}.fn;`
    } else if (Array.isArray(value)) {
      const requireArray = value.map(module => {
        const requireFile = path.resolve(__dirname, 'libs', module)
        return `require('${requireFile}').${key}.fn`
      })
      return `${variableName}['${key}'] = [
${requireArray.join(',\n')}
]`
    }
  })

  const requireCode = Object.keys(requires).map(e => requires[e])
  const code = `
const ${variableName} = {};
${requireCode.join('\n')};
${variableName}.strategy = ${JSON.stringify(strategy)}

module.exports = ${variableName};
	`
  return code
}

const writeServerStrategy = (filename, strategy) => {
  const code = createServerStrategyCode(strategy)
  return fs.writeFile(filename, code)
}

module.exports = writeServerStrategy
