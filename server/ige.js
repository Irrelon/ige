console.log('Executing IGE Under Node.js Version ' + process.version);

// Set a global variable for the location of
// the node_modules folder
modulePath = '../server/node_modules/';

// Load the CoreConfig.js file
igeCoreConfig = require('../engine/CoreConfig.js');

var arr = igeCoreConfig.include,
	arrCount = arr.length,
	arrIndex,
	arrItem,
	itemJs;

// Loop the igeCoreConfig object's include array
// and load the required files
for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
	arrItem = arr[arrIndex];
	if (arrItem[0] === 's' || arrItem[0] === 'cs') {
		itemJs = arrItem[1] + ' = ' + 'require("../engine/' + arrItem[2] + '")';
		// Check if there is a specific object we want to use from the
		// module we are loading
		if (arrItem[3]) {
			itemJs += '.' + arrItem[3] + ';';
		} else {
			itemJs += ';';
		}
		eval(itemJs);
	}
}

// Include the control class
IgeNode = require('./IgeNode');

// Start the app
var igeNode = new IgeNode();