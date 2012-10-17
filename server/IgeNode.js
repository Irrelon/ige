var IgeNode = IgeClass.extend({
	classId: 'IgeNode',

	init: function () {
		// Include required node modules
		var argParse = require("node-arguments").process,
			args = argParse(process.argv, {separator:'-'}),
			self = this;

		this.fs = require('fs');
		this.parser = require('uglify-js').parser;
		this.uglify = require('uglify-js').uglify;

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

				return;
			}

			// Generate a game client-side deployment file
			if (args['-deploy']) {
				this.generateDeploy(args['-deploy'], args['-to']);
				return;
			}

			this.printHelp();
		}
	},

	printHelp: function () {
		console.log('------------------------------------------------------------------------------');
		console.log('* Isogenic Game Engine Server ' + igeVersion + '                                          *');
		console.log('* (C)opyright 2012 Irrelon Software Limited                                  *');
		console.log('* http://www.isogenicengine.com                                              *');
		console.log('------------------------------------------------------------------------------');

		console.log('Usage:');
		console.log('node ige.js [-g gameFolder] [-deploy gameFolder]');
		console.log(' ');
		console.log('For instance to start the game server for the game in ./game1 you would type:');
		console.log('node ige.js -g ./game1');
		console.log(' ');
		console.log('To create a deployment of the game in ./game1 to the folder ./game1Deploy you would type:');
		console.log('node ige.js -deploy ./game1 -to ./game1Deploy');
		console.log(' ');
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

	generateDeploy: function (gamePath, toPath) {
		var self = this;

		console.log('Starting deployment process...');
		var deployOptions;

		if (!toPath) { toPath = gamePath + '/deploy'; }
		console.log('Deployment will be created in: ' + toPath);

		if (this.fs.existsSync(this._gamePath + '/deploy.js')) {
			// Load the deploy options
			deployOptions = require(this._gamePath + '/deploy.js');
		} else {
			deployOptions = {obfuscate: true};
		}

		this._generateStage1(gamePath, toPath, deployOptions);
		return;

		// Check that the deployment folder does not exist
		if (this.fs.existsSync(toPath)) {
			// The deployment folder already exists!
			console.log('Warning, the deployment folder already exists at: ' + toPath);
			console.log('Deploying to this folder will overwrite all existing data!');
			this.ask('-> Type yes to execute: ', function (response) {
				if (response === 'yes') {
					// Init the folder and exit
					console.log('');
					self._generateStage1(gamePath, toPath);
				} else {
					console.log('Operation cancelled, no files were modified.');
					setTimeout(this.exitProcess, 50);
				}
			});
		} else {
			// Create the deployment folder
			console.log('Creating deployment folder: ' + toPath);
			this.fs.mkdirSync(toPath);
			this._generateStage1(gamePath, toPath);
		}
	},

	_generateStage1: function (gamePath, toPath, deployOptions) {
		var fileData = '';

		// Generate the engine core
		fileData += this._createClientEngineCore(gamePath, toPath, deployOptions);
		fileData += this._createClientGame(gamePath, toPath, deployOptions);

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
	},

	_createClientEngineCore: function (gamePath, toPath, deployOptions) {
		console.log('-------------------------');
		console.log('Generating engine core...');
		console.log('-------------------------');

		// Load the CoreConfig.js file
		var fs = this.fs,
			igeCoreConfig = require('../engine/CoreConfig.js'),
			arr = igeCoreConfig.include,
			arrCount = arr.length,
			arrIndex,
			arrItem,
			itemJs,
			///////////////////////////
			finalEngineCoreCode = '',
			fileArr = [],
			fileIndex,
			file,
			data = '';

		// Loop the igeCoreConfig object's include array
		// and load the required files
		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			arrItem = arr[arrIndex];
			if (arrItem[0] === 'c' || arrItem[0] === 'cs') {
				fileArr.push('engine/' + arrItem[2]);
			}
		}

		for (fileIndex = 0; fileIndex < fileArr.length; fileIndex++) {
			file = fileArr[fileIndex];

			console.log('Compiling: ' + process.cwd() + '/' + file);

			// Read the file data
			data = fs.readFileSync(file, 'utf8');

			// Remove client-exclude marked code
			data = data.replace(/\/\* CEXCLUDE \*\/[\s\S.]*?\* CEXCLUDE \*\//g, '');

			if (deployOptions.obfuscate) {
				data = this.obfuscate(data, null, null, true);
			}

			finalEngineCoreCode += data + ';';
		}

		// Write the engine core's file data
		fs.writeFileSync(toPath + '/core.js', finalEngineCoreCode);

		return finalEngineCoreCode;
	},

	_createClientGame: function (gamePath, toPath, deployOptions) {
		console.log('-----------------------');
		console.log('Generating game core...');
		console.log('-----------------------');

		// Load the configuration file and load any modules
		var fs = this.fs,
			arr = require(process.cwd() + '/' + gamePath + '/ClientConfig.js').include,
			arrCount = arr.length,
			i, item, itemModule,
			/////////////////////////
			finalFileData = '',
			fileArr = [],
			fileIndex,
			file,
			data = '';

		// Loop the module items and check they exist first
		console.log('Checking module paths declared in: ' + gamePath + '/ClientConfig.js');
		for (i = 0; i < arrCount; i++) {
			item = arr[i];

			if (!this.fs.existsSync(gamePath + '/' + item)) {
				// The module file is missing, throw an error!
				this.log('Cannot load module from: "' + gamePath + '/' + item + '", exiting!', 'warning');
				setTimeout(this.exitProcess, 50);
				return false;
			} else {
				fileArr.push(item);
			}
		}

		// Loop the script file paths and load each file in turn
		// reading it's content and adding it to the final js data
		console.log('Module paths confirmed, including ' + arr.length + ' module(s)...');
		for (fileIndex = 0; fileIndex < fileArr.length; fileIndex++) {
			file = fileArr[fileIndex];

			console.log('Compiling: ' + process.cwd() + '/' + gamePath + '/' + file);

			// Read the file data
			data = fs.readFileSync(process.cwd() + '/' + gamePath + '/' + file, 'utf8');

			// Remove client-exclude marked code
			data = data.replace(/\/\* CEXCLUDE \*\/[\s\S.]*?\* CEXCLUDE \*\//g, '');

			if (deployOptions.obfuscate) {
				data = this.obfuscate(data, null, null, true);
			}

			finalFileData += data + ';';
		}

		// Write the engine core's file data
		fs.writeFileSync(toPath + '/game.js', finalFileData);

		return finalFileData;
	},

	obfuscate: function (source, seed, opts) {
		var jsp = this.parser,
			pro = this.uglify,
			orig_code,
			ast,
			finCode;

		// Remove client-exclude marked code
		source = source.replace(/\/\* CEXCLUDE \*\/[\s\S.]*?\* CEXCLUDE \*\//g, '');

		// Pass to the uglify-js module
		orig_code = source;
		ast = jsp.parse(orig_code); // parse code and get the initial AST
		ast = pro.ast_mangle(ast); // get a new AST with mangled names
		ast = pro.ast_squeeze(ast); // get an AST with compression optimizations

		finCode = pro.gen_code(ast); // compressed code here

		// Return final code
		return finCode;
	},

	ask: function (question, callback) {
		var readline = require('readline'),
			input = readline.createInterface(process.stdin, process.stdout, null);

		input.question(question, function(answer) {
			input.close();
			process.stdin.destroy();
			callback(answer);
		});
	},

	exitProcess: function () {
		process.exit(1);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeNode; }