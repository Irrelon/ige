"use strict";

var util = require('util'),
	aliasify = require('aliasify'),
	stringify = require('stringify'),
	derequire = require('derequire');

module.exports = function(grunt) {
	grunt.loadNpmTasks("grunt-browserify");

	grunt.initConfig({
		"browserify": {
			"all": {
				src: [
					/*"./app/!*.js",
					"./app/!**!/!**.js",
					"./assets/!**!/!**.js",*/
					"./index.js"
				],
				dest: "./dist.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						["browserify-derequire"]
					],
					// Exclude all server data files from client build
					ignore: ['**/data/*.json']
				}
			}
		}
	});
	
	grunt.registerTask("1: Build Source File", ["browserify"]);
	grunt.registerTask("default", ["1: Build Source File"]);
};