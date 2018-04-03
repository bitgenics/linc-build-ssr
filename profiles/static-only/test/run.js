const cp = require('child_process')
const path = require('path')

const fse = require('fs-extra')

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

const setup = async () => {
  const testPath = path.resolve(__dirname, '..', 'data', 'cra-test')
  process.chdir(path.resolve(__dirname, '..'))
  if (!fse.existsSync(testPath)) {
    console.log('Installing a fresh create-react-app')
    const err = await spawn('npx', ['create-react-app', 'data/cra-test'])
  }
  process.chdir(testPath)
}

const run = async () => {
  await setup()
  console.log(process.cwd())
  require('../src/index.js')(err => {
    if (err) {
      console.log('Err: ', err)
      process.exit(1)
    }
    console.log('Done')
  })
}

run()
