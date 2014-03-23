var IgeGamePadComponent = IgeEventingClass.extend({
	classId: 'IgeGamePadComponent',
	componentId: 'gamePad',
	
	init: function (entity, options) {
		var self = this;
		
		this._entity = entity;
		this._options = options;
		this.gamepadAvailable = null;
			
		// A number of typical buttons recognized by Gamepad API and mapped to
		// standard controls. Any extraneous buttons will have larger indexes.
		this.TYPICAL_BUTTON_COUNT = 16;

		// A number of typical axes recognized by Gamepad API and mapped to
		// standard controls. Any extraneous buttons will have larger indexes.
		this.TYPICAL_AXIS_COUNT = 4;

		// Whether we’re requestAnimationFrameing like it’s 1999.
		this.ticking = false;

		// The canonical list of attached gamepads, without “holes” (always
		// starting at [0]) and unified between Firefox and Chrome.
		this.gamepads = [];

		// Remembers the connected gamepads at the last check; used in Chrome
		// to figure out when gamepads get connected or disconnected, since no
		// events are fired.
		this.prevRawGamepadTypes = [];

		// Previous timestamps for gamepad state; used in Chrome to not bother with
		// analyzing the polled data if nothing changed (timestamp is the same
		// as last time).
		this.prevTimestamps = [];
		
		if (ige.isClient) {
			// As of writing, it seems impossible to detect Gamepad API support
			// in Firefox, hence we need to hardcode it in the third clause. 
			// (The preceding two clauses are for Chrome.)
			this.gamepadAvailable = !!navigator.webkitGetGamepads ||
				!!navigator.webkitGamepads ||
				(navigator.userAgent.indexOf('Firefox/') != -1);
	
			if (!this.gamepadAvailable) {
				// It doesn't seem Gamepad API is available – show a message telling
				// the visitor about it.
				this.emit('notSupported');
			} else {
				// Firefox supports the connect/disconnect event, so we attach event
				// handlers to those.
				window.addEventListener('MozGamepadConnected', function () { self.onGamepadConnect.apply(self, arguments); }, false);
				window.addEventListener('MozGamepadDisconnected', function () { self.onGamepadDisconnect.apply(self, arguments); }, false);
	
				// Since Chrome only supports polling, we initiate polling loop straight
				// away. For Firefox, we will only do it if we get a connect event.
				if (!!navigator.webkitGamepads || !!navigator.webkitGetGamepads) {
					this.startPolling();
				}
			}
			
			entity.addBehaviour('gamePadComponent', this._behaviour);
		}
	},

	onGamepadConnect: function(event) {
		// Add the new gamepad on the list of gamepads to look after.
		this.gamepads.push(event.gamepad);

		// Start the polling loop to monitor button changes.
		this.startPolling();

		// Ask the tester to update the screen to show more gamepads.
		this.emit('change');
	},

	/**
	 * React to the gamepad being disconnected.
	 */
	onGamepadDisconnect: function(event) {
		// Remove the gamepad from the list of gamepads to monitor.
		for (var i in this.gamepads) {
			if (this.gamepads[i].index == event.gamepad.index) {
				this.gamepads.splice(i, 1);
				break;
			}
		}

		// If no gamepads are left, stop the polling loop.
		if (this.gamepads.length == 0) {
			this.stopPolling();
		}

		// Ask the tester to update the screen to remove the gamepad.
		this.emit('change');
	},

	/**
	 * Starts a polling loop to check for gamepad state.
	 */
	startPolling: function() {
		this.ticking = true;
	},

	/**
	 * Stops a polling loop by setting a flag which will prevent the next
	 * requestAnimationFrame() from being scheduled.
	 */
	stopPolling: function() {
		this.ticking = false;
	},

	/**
	 * A function called with each requestAnimationFrame(). Polls the gamepad
	 * status and schedules another poll.
	 */
	_behaviour: function() {
		this.gamePad.pollStatus();
	},

	/**
	 * Checks for the gamepad status. Monitors the necessary data and notices
	 * the differences from previous state (buttons for Chrome/Firefox,
	 * new connects/disconnects for Chrome). If differences are noticed, asks
	 * to update the display accordingly. Should run as close to 60 frames per
	 * second as possible.
	 */
	pollStatus: function() {
		// Poll to see if gamepads are connected or disconnected. Necessary
		// only on Chrome.
		this.pollGamepads();

		for (var i in this.gamepads) {
			var gamepad = this.gamepads[i];

			// Don’t do anything if the current timestamp is the same as previous
			// one, which means that the state of the gamepad hasn’t changed.
			// This is only supported by Chrome right now, so the first check
			// makes sure we’re not doing anything if the timestamps are empty
			// or undefined.
			if (gamepad.timestamp && (gamepad.timestamp == this.prevTimestamps[i])) {
				continue;
			}
			this.prevTimestamps[i] = gamepad.timestamp;
		}
	},

	// This function is called only on Chrome, which does not yet support
	// connection/disconnection events, but requires you to monitor
	// an array for changes.
	pollGamepads: function() {
		// Get the array of gamepads – the first method (getGamepads)
		// is the most modern one and is supported by Firefox 28+ and
		// Chrome 35+. The second one (webkitGetGamepads) is a deprecated method
		// used by older Chrome builds.
		var rawGamepads =
			(navigator.getGamepads && navigator.getGamepads()) ||
				(navigator.webkitGetGamepads && navigator.webkitGetGamepads());

		if (rawGamepads) {
			// We don’t want to use rawGamepads coming straight from the browser,
			// since it can have “holes” (e.g. if you plug two gamepads, and then
			// unplug the first one, the remaining one will be at index [1]).
			this.gamepads = [];

			// We only refresh the display when we detect some gamepads are new
			// or removed; we do it by comparing raw gamepad table entries to
			// “undefined.”
			var gamepadsChanged = false;

			for (var i = 0; i < rawGamepads.length; i++) {
				if (typeof rawGamepads[i] != this.prevRawGamepadTypes[i]) {
					gamepadsChanged = true;
					this.prevRawGamepadTypes[i] = typeof rawGamepads[i];
				}

				if (rawGamepads[i]) {
					this.gamepads.push(rawGamepads[i]);
				}
			}

			// Ask the tester to refresh the visual representations of gamepads
			// on the screen.
			if (gamepadsChanged) {
				this.emit('change');
			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeGamePadComponent; }