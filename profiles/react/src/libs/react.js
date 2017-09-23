import ReactDOMServer from 'react-dom/server';

const renderFn = (renderComponent) => {
    return new Promise((resolve, reject) => {
        try {
            resolve(ReactDOMServer.renderToString(renderComponent));
        } catch (e) {
            resolve('');
        }
    });
}


const render = {
    fn: renderFn,
}

export { render }