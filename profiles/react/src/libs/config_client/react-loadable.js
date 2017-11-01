import path from 'path'

const clientImportFragment = `import Loadable from 'react-loadable'`

const initFragment = () => `Loadable.preloadReady()`

const webpackConfig = distDir => {
  return {
    server: {
      alias: {
        reactloadable: path.resolve(distDir, 'react-loadable.json')
      },
      babel: {
        plugins: ['react-loadable/babel']
      }
    },
    client: {
      plugins: [
        {
          import: 'react-loadable/webpack',
          exportName: 'ReactLoadablePlugin',
          options: {
            filename: path.resolve(distDir, 'react-loadable.json')
          }
        }
      ]
    }
  }
}

export { clientImportFragment, initFragment, webpackConfig }
