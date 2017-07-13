"use strict";

var appCore = require('irrelon-appcore'),
	modulePath,
	igeCoreConfig,
	arr,
	arrCount,
	arrIndex,
	arrItem,
	itemJs,
	argParse,
	args;

console.log('Executing IGE Under Node.js Version ' + process.version);

// Set a global variable for the location of
// the node_modules folder
modulePath = '../server/node_modules/';

// Load the CoreConfig.js file
igeCoreConfig = require('../engine/CoreConfig.js');

arr = igeCoreConfig.include;
arrCount = arr.length;

// Check if we are deploying, if so don't include core modules
argParse = require("node-arguments").process;
args = argParse(process.argv, {separator: '-'});

if (!args['-deploy']) {
	// Loop the igeCoreConfig object's include array
	// and load the required files
	for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
		arrItem = arr[arrIndex];
		if (arrItem[0].indexOf('s') > -1) {
			itemJs = 'var ' + arrItem[1] + ' = ' + 'require("../engine/' + arrItem[2] + '")';
			// Check if there is a specific object we want to use from the
			// module we are loading
			if (arrItem[3]) {
				itemJs += '.' + arrItem[3] + ';';
			} else {
				itemJs += ';';
			}
			console.log('Executing: ' + itemJs);
			
			eval(itemJs);
		}
	}
}

appCore.module('ige', function (IgeEngine) {
	return new IgeEngine();
});

if (typeof module !== 'undefined') {
	module.exports = appCore;
}