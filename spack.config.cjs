const { config } = require('@swc/core/spack')

module.exports = config({
	entry: {
		'web': __dirname + '/index.js',
	},
	output: {
		path: __dirname + '/dist'
	},
	module: {},
});
