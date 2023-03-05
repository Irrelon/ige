var fs = require('fs'),
	dependencies = require('./dependencies.js'),
	arr,
	arrCount,
	arrIndex,
	arrItem;

arr = dependencies.include;
arrCount = arr.length;

// Loop the dependencies object's include array
// and load the required files
for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
	arrItem = arr[arrIndex];
	if (arrItem[0].indexOf('s') > -1) {
		console.log('Requiring: ' + arrItem[2]);
		require('../engine/' + arrItem[2]);
	}
}