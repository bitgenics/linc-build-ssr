const webpack = require('webpack');
const server_config = require('../webpack/webpack.config.server.js');
const client_config = require('../webpack/webpack.config.client.js');

const build = (callback) => {
	webpack(client_config, (err, stats) => {
		console.log(stats.toJson('errors-only').errors.toString());
		webpack(server_config, (err, stats) => {
			console.log(stats.toJson('errors-only').errors.toString());
			callback();
		});
	});
}

module.exports = build