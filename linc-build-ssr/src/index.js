const path = require('path');

const build = (config, packageJson, callback) => {
	const profile = 'generic-react-redux-routerv3';
	const builder = require(path.resolve(process.cwd(), `node_modules/@bitgenics/linc-profile-${profile}`));
	builder(callback);
}

module.exports = build;