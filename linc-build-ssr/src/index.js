const path = require('path');

const build = (config, packageJson, callback) => {
	const profile = (packageJson.linc && packageJson.linc.buildProfile) || 'generic-react-redux-routerv3';
	console.log(`Using build profile: ${profile}`);
	const builder = require(path.resolve(process.cwd(), `node_modules/@bitgenics/linc-profile-${profile}`));
	builder(callback);
}

module.exports = build;