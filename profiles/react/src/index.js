const path = require('path');
const fs = require('fs-extra')
const webpack = require('webpack');
const server_config = require('../webpack/webpack.config.server.js');
const client_config = require('../webpack/webpack.config.client.js');
const semver = require('semver');

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

const pickMatch = (deps, config) => {
	if(deps['react-router']) {
		if(semver.lt(deps['react-router'], '4.0.0')) {
			return 'react-router-v3'
		} else {
			console.log('Do not support react-routerV4 just yet');
			return 'react-router-v4'
		}
	}
}

const pickStatePromise = (deps, config) => {
	if(deps['redux']) {
		return 'promiseCounter'
	}
}

const pickWrapInStoreHoC = (deps, config) => {
	if(deps['react-redux']) {
		return 'react-redux';
	}
}

const pickafterRender = (deps, config) => {
	const afterRender = [];
	if(deps['react-helmet']) {
		afterRender.push('react-helmet');
	}
	return afterRender;
}

const pickCreateStore = (deps, config) => {
	if(deps.redux) {
		return 'redux';
	}
}

const createStrategy = (deps, config) => {
	const strategy = {}
	strategy.match = pickMatch(deps, config);
	strategy.renderToString = 'react';
	strategy.getStatePromiseFromRoute = pickStatePromise(deps, config);
	strategy.wrapInStoreHoC = pickWrapInStoreHoC(deps, config);
	strategy.afterRender = pickafterRender(deps, config);
	strategy.createStore = pickCreateStore(deps, config);
	return strategy;
}

const createServerStrategyCode = (strategy) => {
	const variableName = 'strategy';

	const requires = mapValues(strategy, (value, key) => {
		if(typeof value === 'string') {
			const requireFile = path.resolve(__dirname, value);
			return `${variableName}['${key}'] = require('${requireFile}').${key}.fn;`;
		} else if (Array.isArray(value)) {
			const requireArray = value.map((module) => {
				const requireFile = path.resolve(__dirname, module);
				return `require('${requireFile}').${key}.fn`
			});
			return `${variableName}['${key}'] = [
${requireArray.join(',\n')}
]`
		}
		
	});
	const requireCode = Object.values(requires);
	const code = `
const ${variableName} = {};
${requireCode.join('\n')};
module.exports = ${variableName};
	`
	return code;
}

const writeServerStrategy = async (filename) => {
	const strategy = createStrategy(getDependencies(), {});
	const code = createServerStrategyCode(strategy);
	return fs.writeFile(filename, code);
}

const runWebpack = async (config) => {
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
	await writeServerStrategy(path.resolve(PROJECT_DIR, 'dist', 'server-strategy.js'));
	console.log('Wrote Server Strategy');
	await runWebpack(client_config);
	console.log('Created client package');
	await runWebpack(server_config);
	console.log('Created server package');
	callback();
}

module.exports = build