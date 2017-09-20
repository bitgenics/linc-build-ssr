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


const renderToString = {
    fn: renderToStringFn,
}

export { renderToString }