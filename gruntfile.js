"use strict";

var util = require('util'),
	aliasify = require('aliasify'),
	stringify = require('stringify'),
	derequire = require('derequire');

module.exports = function(grunt) {
	grunt.loadNpmTasks("grunt-browserify");
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.initConfig({
		"jshint": {
			"core": {
				"files": {
					"src": [
						"engine/core/*.js"
					]
				}
			},
			"components": {
				"files": {
					"src": [
						"engine/components/**/*.js",
						"engine/ui/**/*.js"
					]
				}
			},
			"extensions": {
				"files": {
					"src": [
						"engine/extensions/*.js"
					]
				}
			},
			"filters": {
				"files": {
					"src": [
						"engine/filters/*.js"
					]
				}
			},
			options: {
				jshintrc: '.jshintrc'
			}
		},
		
		"browserify": {
			"all": {
				src: [
					"./engine/core/*.js",
					"./engine/assets/*.js",
					"./engine/extensions/*.js",
					"./engine/filters/*.js",
					"./engine/components/*.js",
					"./engine/components/audio/*.js",
					"./engine/components/cocoonjs/*.js",
					"./engine/components/editor/*.js",
					"./engine/components/stackTrace/*.js",
					"./engine/ui/*.js",
					"./index.js"
				],
				dest: "./ige.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						["browserify-derequire"]
					]
				}
			}
		}
	});
	
	grunt.registerTask('buildClientDependenciesFile', 'Build Client Deps', function () {
		var fs = require('fs'),
			dependencies = require('./engine/dependencies.js'),
			clientDepsLine,
			arr,
			arrCount,
			arrIndex,
			arrItem;
		
		clientDepsLine = [];
		
		arr = dependencies.include;
		arrCount = arr.length;

		// Loop the igeCoreConfig object's include array
		// and load the required files
		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			arrItem = arr[arrIndex];
			
			if (arrItem[0].indexOf('c') > -1) {
				clientDepsLine.push("require('./" + arrItem[2] + "');");
			}
		}
		
		fs.writeFileSync('./engine/clientDependencies.js', clientDepsLine.join('\n'));
	});
	
	grunt.registerTask("1: Build Source File", ["browserify"]);
	grunt.registerTask("default", ["1: Build Source File"]);
};