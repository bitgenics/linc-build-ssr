import React, { Component } from 'react'
import PropTypes from 'prop-types'
import htmlescape from 'htmlescape'

export default class LincInit extends Component {
  static contextTypes = {
    _documentProps: PropTypes.any
  }

  render () {
    const props = this.context._documentProps
    let settings
    if(props.dev) {
      try {
        settings = require(`${process.cwd()}/dev.settings.json`)
      } catch (e) {}
    } else {
      settings = props.__LINC_DATA__.settings
    }
    settings = settings || {}
    return <script nonce={this.props.nonce} dangerouslySetInnerHTML={{
      __html:
        `var SETTINGS = ${htmlescape(settings)}
      `
    }} />
  }

}