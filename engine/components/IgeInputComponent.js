var IgeInputComponent = IgeEventingClass.extend({
	classId: 'IgeInput',
	componentId: 'input',

	init: function () {
		// Setup the input objects to hold the current input state
		this._eventQueue = [];
		this.tick();

		this.mouse = {
			// Virtual codes
			x: -258,
			y: -257,
			button1: -256,
			button2: -255,
			button3: -254,
			wheel: -253,
			wheelUp: -252,
			wheelDown: -251
		};

		this.pad1 = {
			// Virtual codes
			button1: -250,
			button2: -249,
			button3: -248,
			button4: -247,
			button5: -246,
			button6: -245,
			button7: -244,
			button8: -243,
			button9: -242,
			button10: -241,
			button11: -240,
			button12: -239,
			button13: -238,
			button14: -237,
			button15: -236,
			button16: -235,
			button17: -234,
			button18: -233,
			button19: -232,
			button20: -231,
			stick1: -230,
			stick2: -229,
			stick1Up: -228,
			stick1Down: -227,
			stick1Left: -226,
			stick1Right: -225,
			stick2Up: -224,
			stick2Down: -223,
			stick2Left: -222,
			stick2Right: -221
		};

		this.pad2 = {
			// Virtual codes
			button1: -220,
			button2: -219,
			button3: -218,
			button4: -217,
			button5: -216,
			button6: -215,
			button7: -214,
			button8: -213,
			button9: -212,
			button10: -211,
			button11: -210,
			button12: -209,
			button13: -208,
			button14: -207,
			button15: -206,
			button16: -205,
			button17: -204,
			button18: -203,
			button19: -202,
			button20: -201,
			stick1: -200,
			stick2: -199,
			stick1Up: -198,
			stick1Down: -197,
			stick1Left: -196,
			stick1Right: -195,
			stick2Up: -194,
			stick2Down: -193,
			stick2Left: -192,
			stick2Right: -191
		};

		// Keycodes from http://www.asciitable.com/
		// and general console.log efforts :)
		this.key = {
			// Virtual codes
			'shift': -3,
			'ctrl': -2,
			'alt': -1,
			// Read codes
			'backspace': 8,
			'tab': 9,
			'enter': 13,
			'escape': 27,
			'space': 32,
			'pageUp': 33,
			'pageDown': 34,
			'end': 35,
			'home': 36,
			'left': 37,
			'up': 38,
			'right': 39,
			'down': 40,
			'insert': 45,
			'del': 46,
			'0': 48,
			'1': 49,
			'2': 50,
			'3': 51,
			'4': 52,
			'5': 53,
			'6': 54,
			'7': 55,
			'8': 56,
			'9': 57,
			'a': 65,
			'b': 66,
			'c': 67,
			'd': 68,
			'e': 69,
			'f': 70,
			'g': 71,
			'h': 72,
			'i': 73,
			'j': 74,
			'k': 75,
			'l': 76,
			'm': 77,
			'n': 78,
			'o': 79,
			'p': 80,
			'q': 81,
			'r': 82,
			's': 83,
			't': 84,
			'u': 85,
			'v': 86,
			'w': 87,
			'x': 88,
			'y': 89,
			'z': 90
		};

		this._controlMap = [];
		this._state = [];
	},

	_setupListeners: function () {
		// Setup the event listeners
		var self = this;

		ige._canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
		ige._canvas.addEventListener('mousedown', function (event) { self._mouseDown(event); }, false);
		ige._canvas.addEventListener('mouseup', function (event) { self._mouseUp(event); }, false);
		ige._canvas.addEventListener('mousemove', function (event) { self._mouseMove(event); }, false);
		ige._canvas.addEventListener('mousewheel', function (event) { self._mouseWheel(event); }, false);
		window.addEventListener('keydown', function (event) { self._keyDown(event); }, false);
		window.addEventListener('keyup', function (event) { self._keyUp(event); }, false);
	},

	_mouseDown: function (event) {
		if (event.button === 0) {
			this._state[this.mouse.button1] = true;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = true;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = true;
		}

		this.mouseDown = true;

		this.emit('mouseDown', event);
	},

	_mouseUp: function (event) {
		if (event.button === 0) {
			this._state[this.mouse.button1] = false;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = false;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = false;
		}

		this.mouseUp = true;

		this.emit('mouseUp', event);
	},

	_mouseMove: function (event) {
		this._state[this.mouse.x] = event.clientX - ige.geometry.x2;
		this._state[this.mouse.y] = event.clientY - ige.geometry.y2;

		this.mouseMove = true;

		this.emit('mouseMove', event);
	},

	_mouseWheel: function (event) {
		this._state[this.mouse.wheel] = event.wheelDelta;

		if (event.wheelDelta > 0) {
			this._state[this.mouse.wheelUp] = true;
		} else {
			this._state[this.mouse.wheelDown] = true;
		}

		this.emit('mouseWheel', event);
	},

	_keyDown: function (event) {
		this._state[event.keyCode] = true;

		this.emit('keyDown', event);
	},

	_keyUp: function (event) {
		this._state[event.keyCode] = false;

		this.emit('keyUp', event);
	},

	/**
	 * Defines an action that will be emitted when the specified event type
	 * occurs.
	 * @param actionName
	 * @param eventCode
	 */
	mapAction: function (actionName, eventCode) {
		this._controlMap[actionName] = eventCode;
	},

	/**
	 * Returns the passed action's input state value.
	 * @param actionName
	 */
	actionVal: function (actionName) {
		return this._state[this._controlMap[actionName]];
	},

	/**
	 * Returns true if the passed action's input is pressed or it's state
	 * is not zero.
	 * @param actionName
	 */
	actionState: function (actionName) {
		var val = this._state[this._controlMap[actionName]];
		return !!val; // "Not not" to convert to boolean true/false
	},

	/**
	 * Returns an input's current value.
	 * @param actionName
	 * @return {*}
	 */
	val: function (inputId) {
		return this._state[inputId];
	},

	/**
	 * Returns an input's current state as a boolean.
	 * @param stateId
	 * @return {Boolean}
	 */
	state: function (inputId) {
		return !!this._state[inputId];
	},

	/**
	 * Called by the engine after ALL other tick methods have processed.
	 * Allows us to reset any flags etc.
	 */
	tick: function () {
		// If we have an event queue, process it
		var arr = this._eventQueue,
			arrCount = arr.length,
			returnVal;

		while (arrCount--) {
			returnVal = arr[arrCount][1].apply(arr[arrCount][0]);
			if (returnVal === 1) {
				// The last event queue method returned true so cancel all further
				// event processing (the last event took control of the input)
				break;
			}
		}

		this._eventQueue = [];
		this.dblClick = false; // TODO: Add double-click event handling
		this.mouseMove = false;
		this.mouseDown = false;
		this.mouseUp = false;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInputComponent; }