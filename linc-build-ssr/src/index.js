const path = require('path');
const fse = require('fs-extra');

/**
 * Build a site based on the profile provided in package.json.
 * @param config
 * @param packageJson
 * @param callback
 */
const build = (config, packageJson, callback) => {
	const lincConfig = packageJson.linc || {};
	const profile = lincConfig.buildProfile || 'linc-profile-generic-react-redux-routerv3';
	const errorHtmls = lincConfig.errorDir || 'errors';
	const errorSrc = path.resolve(process.cwd(), errorHtmls);
	if (fse.pathExistsSync(errorSrc) ){
		const errorDest = path.resolve(process.cwd(), 'dist', 'static', '_errors');
		fse.ensureDir(errorDest);
		fse.copySync(errorSrc, errorDest);
	}
	console.log(`Using build profile: ${profile}`);
	const builder = require(path.resolve(process.cwd(), `node_modules/${profile}`));
	builder(callback);
};

module.exports = build;
