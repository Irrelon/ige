var IgeNode = IgeClass.extend({
	classId: 'IgeNode',

	init: function () {
		// Include required node modules
		var argParse = require("node-arguments").process,
			args = argParse(process.argv, {separator:'-'}),
			self = this;

		this.fs = require('fs');

		this.exitProcess = function () {
			process.exit(1);
		};

		// If the user requested help, print it and exit
		if (args['-h']) {
			this.printHelp();
			process.exit();
		} else {
			// Load a game and run the server for it
			if (args['-g']) {
				// Output our header
				console.log('------------------------------------------------------------------------------');
				console.log('* Isogenic Game Engine Server ' + igeVersion + '                                          *');
				console.log('* (C)opyright 2012 Irrelon Software Limited                                  *');
				console.log('* http://www.isogenicengine.com                                              *');
				console.log('------------------------------------------------------------------------------');
				this.log('Starting pre-init process. IGE Game Server loading...');
				this.log('Current working directory is: ' + process.cwd());

				// Setup any passed arguments
				if (this.gamePath(args['-g'])) {
					// Set a timeout to execute the main server method
					// so we can flush the console and see useful process
					// info before any potential crash.
					setTimeout(function () {
						// Call the main method
						self.main();
					}, 50);
				}
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
			if (gamePath.substr(0, 1) === '/') {
				// Absolute path
				//this.log('Game path is absolute: ' + gamePath);
				this._gamePath = gamePath + '/';
			} else {
				// Relative path
				//this.log('Game path is relative: ' + gamePath);
				this._gamePath = process.cwd() + '/' + gamePath + '/';
			}

			// Check that the game's required files exist
			if (!this.fs.existsSync(this._gamePath + 'server.js')) {
				// The server.js file is missing, throw an error!
				this.log('The game\'s server.js file cannot be found at: "' + this._gamePath + 'server.js", exiting!', 'warning');
				setTimeout(this.exitProcess, 50);
				return false;
			} else if (!this.fs.existsSync(this._gamePath + 'index.js')) {
				// The index.js file is missing, throw an error!
				this.log('The game\'s index.js file cannot be found at: "' + this._gamePath + 'index.js", exiting!', 'warning');
				setTimeout(this.exitProcess, 50);
				return false;
			} else if (!this.fs.existsSync(this._gamePath + 'ServerConfig.js')) {
				// The index.js file is missing, throw an error!
				this.log('The game\'s ServerConfig.js file cannot be found at: "' + this._gamePath + 'ServerConfig.js", exiting!', 'warning');
				setTimeout(this.exitProcess, 50);
				return false;
			} else {
				this.log('Starting game server in path: ' + process.cwd() + '/' + gamePath);
				return true;
			}
		}
	},

	main: function () {
		this.Server = require(this._gamePath + 'server.js');
		this.Game = require(this._gamePath + 'index.js');

		// Load the configuration file and load any modules
		this.config = require(this._gamePath + 'ServerConfig.js');

		var arr = this.config.include,
			arrCount = arr.length,
			i, item, itemModule;

		// Loop the module items and check they exist first
		this.log('Checking module paths declared in: ' + this._gamePath + 'ServerConfig.js');
		for (i = 0; i < arrCount; i++) {
			item = arr[i];

			if (!this.fs.existsSync(this._gamePath + item.path + '.js')) {
				// The module file is missing, throw an error!
				this.log('Cannot load module from: "' + this._gamePath + item.path + '.js", exiting!', 'warning');
				setTimeout(this.exitProcess, 50);
				return false;
			}
		}

		// All the modules exist, load them
		this.log('Module paths confirmed, including ' + this.config.include.length + ' module(s)...');
		for (i = 0; i < arrCount; i++) {
			item = arr[i];

			itemModule = require(this._gamePath + item.path);
			eval(item.name + ' = itemModule;');
			this.log('Module "' + item.name + '" loaded from: "' + this._gamePath + item.path + '.js"');
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