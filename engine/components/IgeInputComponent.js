var IgeInputComponent = IgeEventingClass.extend({
	classId: 'IgeInput',
	componentId: 'input',

	init: function () {
		// Setup the input objects to hold the current input state
		this._eventQueue = [];
		this._eventControl = {
			_cancelled: false,
			stopPropagation: function () {
				this._cancelled = true;
			}
		};

		this.tick();

		this.mouse = {
			// Virtual codes
			dblClick: -302,
			down: -301,
			up: -300,
			move: -259,
			wheel: -258,
			wheelUp: -257,
			wheelDown: -256,
			x: -255,
			y: -254,
			button1: -253,
			button2: -252,
			button3: -251
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

		// Set default values for the mouse position
		this._state[this.mouse.x] = 0;
		this._state[this.mouse.y] = 0;
	},

	debug: function (val) {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}

		return this._debug;
	},

	/**
	 * Sets up the event listeners on the main window and front
	 * buffer DOM objects.
	 * @private
	 */
	_setupListeners: function () {
		// Setup the event listeners
		var self = this,
			canvas = ige._canvas;

		// Listen for mouse events
		canvas.addEventListener('mousedown', function (event) { self._rationalise(event); self._mouseDown(event); });
		canvas.addEventListener('mouseup', function (event) { self._rationalise(event); self._mouseUp(event); });
		canvas.addEventListener('mousemove', function (event) { self._rationalise(event); self._mouseMove(event); });
		canvas.addEventListener('mousewheel', function (event) { self._rationalise(event); self._mouseWheel(event); });

		// Touch events
		canvas.addEventListener('touchmove', function (event) { event.preventDefault(); self._rationalise(event, true); self._mouseMove(event); });
		canvas.addEventListener('touchstart', function (event) { event.preventDefault(); self._rationalise(event, true); self._mouseDown(event); });
		canvas.addEventListener('touchend', function (event) { event.preventDefault(); self._rationalise(event, true); self._mouseUp(event); });

		// Kill the context menu on right-click, urgh!
		canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); }, false);

		// Listen for keyboard events
		window.addEventListener('keydown', function (event) { self._rationalise(event); self._keyDown(event); }, false);
		window.addEventListener('keyup', function (event) { self._rationalise(event); self._keyUp(event); }, false);
	},

	/**
	 * Sets igeX and igeY properties in the event object that
	 * can be relied on to provide the x, y co-ordinates of the
	 * mouse event including the canvas offset.
	 * @param {Event} event The event object.
	 * @private
	 */
	_rationalise: function (event, touch) {
		if (touch) {
			event.button = 0; // Emulate left mouse button

			// Handle touch changed
			if (event.changedTouches && event.changedTouches.length) {
				event.igePageX = event.changedTouches[0].pageX;
				event.igePageY = event.changedTouches[0].pageY;

				console.log(event.changedTouches[0], event.changedTouches[0].pageX, event.changedTouches[0].pageY);
			}
		} else {
			event.igePageX = event.pageX;
			event.igePageY = event.pageY;
		}

		event.igeX = (event.igePageX - ige._canvas.offsetLeft);
		event.igeY = (event.igePageY - ige._canvas.offsetTop);
	},

	/**
	 * Emits the "mouseDown" event.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (this._debug) {
			console.log('Mouse Down', event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.igeX - ige.geometry.x2,
			my = event.igeY - ige.geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		if (event.button === 0) {
			this._state[this.mouse.button1] = true;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = true;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = true;
		}

		this.mouseDown = event;

		this.queueEvent(this, function () {
			self.emit('mouseDown', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "mouseUp" event.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (this._debug) {
			console.log('Mouse Up', event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.igeX - ige.geometry.x2,
			my = event.igeY - ige.geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		if (event.button === 0) {
			this._state[this.mouse.button1] = false;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = false;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = false;
		}

		this.mouseUp = event;

		this.queueEvent(this, function () {
			self.emit('mouseUp', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "mouseMove" event.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		// Update the mouse position within the viewports
		ige._mouseOverVp = this._updateMouseData(event);

		var mx = event.igeX - ige.geometry.x2,
			my = event.igeY - ige.geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		this._state[this.mouse.x] = mx;
		this._state[this.mouse.y] = my;

		this.mouseMove = event;

		this.queueEvent(this, function () {
			self.emit('mouseMove', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "mouseWheel" event.
	 * @param event
	 * @private
	 */
	_mouseWheel: function (event) {
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.igeX - ige.geometry.x2,
			my = event.igeY - ige.geometry.y2,
			self = this;

		event.igeBaseX = mx;
		event.igeBaseY = my;

		this._state[this.mouse.wheel] = event.wheelDelta;

		if (event.wheelDelta > 0) {
			this._state[this.mouse.wheelUp] = true;
		} else {
			this._state[this.mouse.wheelDown] = true;
		}

		this.mouseWheel = event;

		this.queueEvent(this, function () {
			self.emit('mouseWheel', [event, mx, my, event.button + 1]);
		});
	},

	/**
	 * Emits the "keyDown" event.
	 * @param event
	 * @private
	 */
	_keyDown: function (event) {
		var self = this;

		this._state[event.keyCode] = true;
		this.queueEvent(this, function () {
			self.emit('keyDown', [event, event.keyCode]);
		});
	},

	/**
	 * Emits the "keyUp" event.
	 * @param event
	 * @private
	 */
	_keyUp: function (event) {
		var self = this;

		this._state[event.keyCode] = false;
		this.queueEvent(this, function () {
			self.emit('keyUp', [event, event.keyCode]);
		});
	},

	/**
	 * Loops the mounted viewports and updates their respective mouse
	 * co-ordinates so that mouse events can work out where on a viewport
	 * they occurred.
	 *
	 * @param event
	 * @return {*}
	 * @private
	 */
	_updateMouseData: function (event) {
		// Loop the viewports and check if the mouse is inside
		var arr = ige._children,
			arrCount = arr.length,
			vp, vpUpdated,
			mx = event.igeX - ige.geometry.x / 2,
			my = event.igeY - ige.geometry.y / 2;

		ige._mousePos.x = mx;
		ige._mousePos.y = my;

		while (arrCount--) {
			vp = arr[arr.length - (arrCount + 1)];
			// Check if the mouse is inside this viewport's bounds
			// TODO: Update this code to take into account viewport rotation and camera rotation
			if (mx > vp._translate.x - vp.geometry.x / 2 && mx < vp._translate.x + vp.geometry.x / 2) {
				if (my > vp._translate.y - vp.geometry.y / 2 && my < vp._translate.y + vp.geometry.y / 2) {
					// Mouse is inside this viewport
					vp._mousePos = new IgePoint(
						Math.floor((mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x),
						Math.floor((my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y),
						0
					);

					vpUpdated = vp;
					break;
				}
			}
		}

		return vpUpdated;
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
	 * Stops further event propagation for this tick.
	 * @return {*}
	 */
	stopPropagation: function () {
		this._eventControl._cancelled = true;
		return this;
	},

	/**
	 * Adds an event method to the eventQueue array. The array is
	 * processed during each tick after the scenegraph has been
	 * rendered.
	 * @param context
	 * @param ev
	 */
	queueEvent: function (context, ev) {
		if (ev !== undefined) {
			this._eventQueue.push([context, ev]);
		}

		return this;
	},

	/**
	 * Called by the engine after ALL other tick methods have processed.
	 * Call originates in IgeEngine.js. Allows us to reset any flags etc.
	 */
	tick: function () {
		// If we have an event queue, process it
		var arr = this._eventQueue,
			arrCount = arr.length,
			evc = this._eventControl;

		while (arrCount--) {
			arr[arrCount][1].apply(arr[arrCount][0], [evc]);
			if (evc._cancelled) {
				// The last event queue method stopped propagation so cancel all further
				// event processing (the last event took control of the input)
				break;
			}
		}

		// Reset all the flags and variables for the next tick
		this._eventQueue = [];
		this._eventControl._cancelled = false;
		this.dblClick = false; // TODO: Add double-click event handling
		this.mouseMove = false;
		this.mouseDown = false;
		this.mouseUp = false;
		this.mouseWheel = false;
	},

	/**
	 * Emit an event by name. Overrides the IgeEventingClass emit method and
	 * checks for propagation stopped by calling ige.input.stopPropagation().
	 * @param {Object} eventName The name of the event to listen for.
	 * @param {Object || Array} args The arguments to send to any listening methods. If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 */
	emit: function (eventName, args) {
		if (this._eventListeners) {
			// Check if the event has any listeners
			if (this._eventListeners[eventName]) {

				// Fire the listeners for this event
				var eventCount = this._eventListeners[eventName].length,
					eventCount2 = this._eventListeners[eventName].length - 1,
					evc = this._eventControl,
					finalArgs, i, cancelFlag, eventIndex, tempEvt, retVal;

				// If there are some events, ensure that the args is ready to be used
				if (eventCount) {
					finalArgs = [];
					if (typeof(args) === 'object' && args !== null && args[0] !== null) {
						for (i in args) {
							if (args.hasOwnProperty(i)) {
								finalArgs[i] = args[i];
							}
						}
					} else {
						finalArgs = [args];
					}

					// Loop and emit!
					cancelFlag = false;

					this._eventListeners._processing = true;
					while (eventCount--) {
						if (evc._cancelled) {
							// The stopPropagation() method was called, cancel all other event calls
							break;
						}
						eventIndex = eventCount2 - eventCount;
						tempEvt = this._eventListeners[eventName][eventIndex];

						// If the sendEventName flag is set, overwrite the arguments with the event name
						if (tempEvt.sendEventName) { finalArgs = [eventName]; }

						// Call the callback
						retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

						// If the retVal === true then store the cancel flag and return to the emitting method
						if (retVal === true || this._eventControl._cancelled === true) {
							// The receiver method asked us to send a cancel request back to the emitter
							cancelFlag = true;
						}

						// Check if we should now cancel the event
						if (tempEvt.oneShot) {
							// The event has a oneShot flag so since we have fired the event,
							// lets cancel the listener now
							this.off(eventName, tempEvt);
						}
					}
					this._eventListeners._processing = false;

					// Now process any event removal
					this._processRemovals();

					if (cancelFlag) {
						return 1;
					}

				}

			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeInputComponent; }