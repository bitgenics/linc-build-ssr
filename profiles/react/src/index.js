const path = require('path');
const webpack = require('webpack');
const server_config = require('../webpack/webpack.config.server.js');
const client_config = require('../webpack/webpack.config.client.js');
const createStrategy = require('./strategy');
const generateServerStrategy = require('./generateServerStrategy');
const generateClient = require('./generateClient');

const PROJECT_DIR = process.cwd();

const mapValues = (obj, iterator) => {
	const keys = Object.keys(obj);
	const mapped = {};
	keys.forEach((key) => {
		mapped[key] = iterator(obj[key], key, obj);
	});
	return mapped;
};

const getDependencies = () => {
	const packageJson = require(path.resolve(PROJECT_DIR, 'package.json'));
	const nodeModuleDir = path.resolve(PROJECT_DIR, 'node_modules');
	const deps = Object.assign({}, packageJson.dependencies, packageJson.devDependencies);
	return mapValues(deps, (_, name) => {
		const pjf = path.resolve(nodeModuleDir, name, 'package.json');
		const pj = require(pjf);
		return pj.version;
	})
}

const runWebpack = (config) => {
	return new Promise((resolve, reject) => {
		webpack(config, (err, stats) => {
			if(err) return reject(err);
			const errors = stats.toJson('errors-only').errors.toString();
			if(errors) return reject(errors);
			resolve();
		});	
	})
}

const build = async (callback) => {
	const strategy = createStrategy(getDependencies(), {});
	await generateClient(path.resolve(PROJECT_DIR, 'dist', 'client.js'), strategy);
	const serverStrategy = generateServerStrategy(path.resolve(PROJECT_DIR, 'dist', 'server-strategy.js'), strategy);
	console.log('Creating a client package. This can take a minute or two..');
	await runWebpack(client_config);
	console.log('Created client package');
	console.log('Now working on server package');
	await serverStrategy;
	await runWebpack(server_config);
	console.log('Created server package');
	callback();
}

module.exports = build