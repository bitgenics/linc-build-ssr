const semver = require('semver');

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

const createStrategy = (deps, config) => {
	const strategy = {}
	strategy.match = pickMatch(deps, config);
	strategy.router = strategy.match;
	strategy.renderToString = 'react';
	strategy.getStatePromise = pickStatePromise(deps, config);
	strategy.wrapInStoreHoC = pickWrapInStoreHoC(deps, config);
	strategy.afterRender = pickafterRender(deps, config);
	strategy.render = 'react';
	return strategy;
}

module.exports = createStrategy;