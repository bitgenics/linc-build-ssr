const webpackConfig = distDir => {
  return {
    server: {
      babel: {
        plugins: [
          [
            'babel-plugin-styled-components',
            {
              ssr: true
            }
          ]
        ]
      }
    },
    client: {
      babel: {
        plugins: [
          [
            'babel-plugin-styled-components',
            {
              ssr: true
            }
          ]
        ]
      }
    }
  }
}

export { webpackConfig }
