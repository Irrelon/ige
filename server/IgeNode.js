var IgeNode = IgeClass.extend({
	init: function () {
		// Output our header
		console.log('------------------------------------------------------------------------------');
		console.log('* Isogenic Game Engine Server ' + version + '                                          *');
		console.log('* (C)opyright 2012 Irrelon Software Limited                                  *');
		console.log('* http://www.isogenicengine.com                                              *');
		console.log('------------------------------------------------------------------------------');

		this.log('Starting pre-init process. IGE Game Server loading...');

		// Include required node modules
		var argParse = require("node-arguments").process,
			args = argParse(process.argv, {separator:'-'});

		// If the user requested help, print it and exit
		if (args['-h']) {
			this.printHelp();
			process.exit();
		} else {
			// Setup any passed arguments
			this.gamePath(args['-g']);

			// Call the main method
			this.main();
		}
	},

	printHelp: function () {
		console.log('-------------------------------------------------');
		console.log('* Isogenic Game Engine Server                   *');
		console.log('* COMMAND HELP                                  *');
		console.log('-------------------------------------------------');
		// TODO: Finish this console output
	},

	gamePath: function (gamePath) {
		if (typeof(gamePath) !== 'undefined') {
			this.log('Starting game server in path: ' + gamePath);
			this._gamePath = gamePath;
		}
	},

	main: function () {
		this.Server = require(this._gamePath + '/server.js');
		this.Game = require(this._gamePath + '/index.js');

		// Load the configuration file and load any modules
		this.config = require(this._gamePath + '/ServerConfig.js');
		this.log('Configuration loaded. Including ' + this.config.include.length + ' module(s)...');

		var arr = this.config.include,
			arrCount = arr.length,
			i, item, itemModule;

		for (i = 0; i < arrCount; i++) {
			item = arr[i];
			itemModule = require(this._gamePath + item.path); //this.Server.prototype[item.name]
			eval(item.name + ' = itemModule;');
			this.log('Module "' + item.name + '" loaded');
		}

		// Create a new Game instance
		this.game = new this.Game(this.Server);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeNode; }