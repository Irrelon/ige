var IgeNode = IgeClass.extend({
	init: function () {
		// Include required node modules
		var argParse = require("node-arguments").process,
			args = argParse(process.argv, {separator:'-'});

		// If the user requested help, print it and exit
		if (args['-h']) {
			this.printHelp();
			process.exit();
		} else {
			// Load a game and run the server for it
			if (args['-g']) {
				// Output our header
				console.log('------------------------------------------------------------------------------');
				console.log('* Isogenic Game Engine Server ' + version + '                                          *');
				console.log('* (C)opyright 2012 Irrelon Software Limited                                  *');
				console.log('* http://www.isogenicengine.com                                              *');
				console.log('------------------------------------------------------------------------------');
				this.log('Starting pre-init process. IGE Game Server loading...');

				// Setup any passed arguments
				this.gamePath(args['-g']);

				// Call the main method
				this.main();
			}

			// Generate a game client-side deployment file
			if (args['-deploy']) {
				this.generateDeploy(args['-deploy']);
			}
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
			itemModule = require(this._gamePath + item.path);
			eval(item.name + ' = itemModule;');
			this.log('Module "' + item.name + '" loaded');
		}

		// Create a new Game instance and pass the config details to it
		this.game = new this.Game(this.Server, this.config);
	},

	generateDeploy: function (gamePath) {
		var deployOptions = require(this._gamePath + '/deploy.js');

		// Create the deployment folder

		// Load the game's main html file (usually index.html)

		// Read through the html and match any script tags,
		// extracting the required file paths as we go

		// Loop the script file paths and load each file in turn
		// reading it's content and adding it to the final js data

		// Check if we should obfuscate the final file or leave it
		// as it is, intact with all comments and code

		// Save final deployment js file

		// Loop the game folder and copy any folders we find into
		// the deployment folder unless they match one of the ignore
		// paths

		// Check if we should generate a zip file of the final
		// deployment folder contents

		// Final deployment folder layout:
		// + ./deploy
		//   + assets
		//   + css
		//   + views
		// deploy.js - Final packaged code
		// index.html - Modified index.html which only loads deploy.js

	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeNode; }