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
			this.log('Game path set to: ' + gamePath);
			this._gamePath = gamePath;
		}
	},

	main: function () {
		this.Server = require(this._gamePath + '/server.js');
		this.Game = require(this._gamePath + '/index.js');

		// Create a new Game instance
		this.game = new this.Game(this.Server);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeNode; }