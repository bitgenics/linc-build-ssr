import ReactDOMServer from 'react-dom/server';

const renderToStringFn = (renderComponent) => {
    return new Promise((resolve, reject) => {
        try {
            resolve(ReactDOMServer.renderToString(renderComponent));
        } catch (e) {
            resolve('');
        }
    });
}

const clientImportFragment = `
import React from 'react'
import { render } from 'react-dom'`

const clientCodeFragment = (renderComponent, rootId) => `
render(${renderComponent}, document.getElementById('${rootId}')
`

const renderToString = {
    fn: renderToStringFn,
    clientImportFragment,
    clientCodeFragment
}

export { renderToString }