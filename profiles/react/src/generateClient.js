const path = require('path');
const fs = require('fs-extra');

const steps = ['getStatePromise', 'router', 'wrapInStoreHoC', 'render', 'afterRender']

const getImports = (libs) => {
	const imports = ["import React from 'react'"]

}

const requireLib = (module) => {
	const file = path.resolve(__dirname, 'libs', 'config_client', module);
	try {
		return require(file);
	} catch (e) {
		return undefined;
	}
} 

const createClientStrategy = (strategy) => {
	const clientStrategy = {};
	steps.forEach((step) => {
		const module = strategy[step];
		if(typeof module === 'string') {
			clientStrategy[step] = requireLib(module);
		} else if (Array.isArray(module)) {
			clientStrategy[step] = module.map((name) => requireLib(name));
		}
	});
	return clientStrategy;
}

const createClientCode = (strategy) => {
	const clientStrategy = createClientStrategy(strategy);
	console.log(clientStrategy);
	return clientStrategy;	
}

const generateClient = (filename, strategy) => {
	const code = createClientCode(strategy);
	return fs.writeFile(filename, code);
}

module.exports = generateClient;