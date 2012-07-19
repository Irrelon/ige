var IgeEngine = IgeEntity.extend({
	classId: 'IgeEngine',

	init: function () {
		this._super();

		// Determine the environment we are executing in
		if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
			this.isServer = true;
		} else {
			this.isServer = false;
		}

		// Assign ourselves to the global variable
		ige = this;

		// Output our header
		console.log('------------------------------------------------------------------------------');
		console.log('* Powered by the Isogenic Game Engine ' + version + '                                  *');
		console.log('* (C)opyright 2012 Irrelon Software Limited                                  *');
		console.log('* http://www.isogenicengine.com                                              *');
		console.log('------------------------------------------------------------------------------');

		// Call super-class method
		this._super();

		// Set the initial id as the current time in milliseconds. This ensures that under successive
		// restarts of the engine, new ids will still always be created compared to earlier runs -
		// which is important when storing persistent data with ids etc
		this._idCounter = new Date().getTime();

		// Setup components
		this.addComponent(IgeInputComponent);
		this.addComponent(IgeTweenComponent);

		// Set some defaults
		this._state = 0; // Currently stopped
		this._texturesLoading = 0; // Holds a count of currently loading textures
		this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
		this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
		this._drawsLastTick = 0; // Number of draws that occurred last tick
		this._frames = 0; // Number of frames looped through since last second tick
		this._fps = 0; // Number of frames per second
		this._clientNetDiff = 0; // The difference between the server and client comms (only non-zero on clients)
		this._frameAlternator = false; // Is set to the boolean not of itself each frame
		this._viewportDepth = false;
		this._mousePos = new IgePoint(0, 0, 0);

		if (this.isServer) {
			// Setup a dummy canvas context
			this.log('Using dummy canvas context');
			this._ctx = IgeDummyContext;
		}

		this.dependencyTimeout(30000); // Wait 30 seconds to load all dependencies then timeout

		// Add the textures loaded dependency
		this._dependencyQueue.push(this.texturesLoaded);
		this._dependencyQueue.push(this.canvasReady);

		// Start a timer to record every second of execution
		setInterval(this._secondTick, 1000);
	},

	/**
	 * Checks if all engine start dependencies have been satisfied.
	 * @return {Boolean}
	 */
	dependencyCheck: function () {
		var arr = this._dependencyQueue,
			arrCount = arr.length;

		while (arrCount--) {
			if (!this._dependencyQueue[arrCount]()) {
				return false;
			}
		}

		return true;
	},

	/**
	 * Gets / sets the flag that determines if viewports should be sorted by depth
	 * like regular entities, before they are processed for rendering each frame.
	 * Depth-sorting viewports increases processing requirements so if you do not
	 * need to stack viewports in a particular order, keep this flag false.
	 * @param {Boolean} val
	 * @return {Boolean}
	 */
	viewportDepth: function (val) {
		if (val !== undefined) {
			this._viewportDepth = val;
			return this;
		}

		return this._viewportDepth;
	},

	/**
	 * Sets the number of milliseconds before the engine gives up waiting for dependencies
	 * to be satisfied and cancels the startup procedure.
	 * @param val
	 */
	dependencyTimeout: function (val) {
		this._dependencyCheckTimeout = val;
	},

	/**
	 * Adds one to the number of textures currently loading.
	 */
	textureLoadStart: function () {
		this._texturesLoading++;
	},

	/**
	 * Subtracts one from the number of textures currently loading and if no more need
	 * to load, it will also call the _allTexturesLoaded() method.
	 */
	textureLoadEnd: function () {
		this._texturesLoading--;

		if (this._texturesLoading === 0) {
			// All textures have finished loading
			this._allTexturesLoaded();
		}
	},

	/**
	 * Checks if all textures have finished loading and returns true if so.
	 * @return {Boolean}
	 */
	texturesLoaded: function () {
		return ige._texturesLoading === 0;
	},

	/**
	 * Emits the "texturesLoaded" event.
	 * @private
	 */
	_allTexturesLoaded: function () {
		this.log('All textures have loaded');

		// Fire off an event about this
		this.emit('texturesLoaded');
	},

	/**
	 * Checks to ensure that a canvas has been assigned to the engine or that the
	 * engine is in server mode.
	 * @return {Boolean}
	 */
	canvasReady: function () {
		return (ige._canvas !== undefined || ige.isServer);
	},

	/**
	 * Generates a new unique ID
	 * @return {String}
	 */
	newId: function () {
		this._idCounter++;
		return String(this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17)));
	},

	/**
	 * Generates a new 16-character hexadecimal unique ID
	 * @return {String}
	 */
	newIdHex: function () {
		this._idCounter++;
		return (this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17))).toString(16);
	},

	/**
	 * Starts the engine.
	 * @param callback
	 */
	start: function (callback) {
		if (!ige._state) {
			// Check if we are able to start based upon any registered dependencies
			if (ige.dependencyCheck()) {
				// Start the engine
				ige.log('Starting engine...');
				ige._state = 1;

				requestAnimFrame(ige.tick);

				ige.log('Engine started');

				// Fire the callback method if there was one
				if (typeof(callback) === 'function') {
					callback(true);
				}
			} else {
				// Get the current timestamp
				var curTime = new Date().getTime();

				// Record when we first started checking for dependencies
				if (!ige._dependencyCheckStart) {
					ige._dependencyCheckStart = curTime;
				}

				// Check if we have timed out
				if (curTime - ige._dependencyCheckStart > this._dependencyCheckTimeout) {
					this.log('Engine start failed because the dependency check timed out after ' + (this._dependencyCheckTimeout / 1000) + ' seconds', 'error');
					if (typeof(callback) === 'function') {
						callback(false);
					}
				} else {
					// Start a timer to keep checking dependencies
					setTimeout(function () { ige.start(callback); }, 200);
				}
			}
		}
	},

	/**
	 * Stops the engine.
	 * @return {Boolean}
	 */
	stop: function () {
		// If we are running, stop the engine
		if (this._state) {
			this.log('Stopping engine...');
			this._state = 0;

			return true;
		} else {
			return false;
		}
	},

	/**
	 * Gets / sets the _autoSize property. If set to true, the engine will listen
	 * for any change in screen size and resize the front-buffer (canvas) element
	 * to match the new screen size.
	 * @param val
	 * @return {Boolean}
	 */
	autoSize: function (val) {
		if (typeof(val) !== 'undefined') {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	},

	/**
	 * Automatically creates a canvas element, appends it to the document.body
	 * and sets it's 2d context as the current front-buffer for the engine.
	 * @param autoSize
	 */
	createFrontBuffer: function (autoSize) {
		if (!this.isServer) {
			// Create a new canvas element to use as the
			// rendering front-buffer
			var tempCanvas = document.createElement('canvas');
			tempCanvas.id = 'igeFrontBuffer';
			document.body.appendChild(tempCanvas);
			this.canvas(tempCanvas, autoSize);
		}
	},

	/**
	 * Sets the canvas element that will be used as the front-buffer.
	 * @param elem
	 * @param autoSize
	 */
	canvas: function (elem, autoSize) {
		if (!this._canvas) {
			// Setup front-buffer canvas element
			this._canvas = elem;
			if (autoSize) {
				this._autoSize = autoSize;

				// Add some event listeners
				window.addEventListener('resize', this._resizeEvent);
				this._canvas.addEventListener('mousemove', this._mouseMove);

				// Fire the resize event
				this._resizeEvent();
			}

			this.input._setupListeners();
			this._ctx = this._canvas.getContext('2d');
		}
	},

	/**
	 * Clears the entire canvas.
	 */
	clearCanvas: function () {
		// Clear the whole canvas
		this._ctx.clearRect(
			0,
			0,
			this._canvas.width,
			this._canvas.height
		);
	},

	/**
	 * Emits the "mouseDown" event.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		// Emit the event
		this.emit('mouseDown', event);
	},

	/**
	 * Emits the "mouseUp" event.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		// Emit the event
		this.emit('mouseUp', event);
	},

	/**
	 * Emits the "mouseMove" event.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		// Loop the viewports and check if the mouse is inside
		var arr = ige._children,
			arrCount = arr.length,
			vp, gotVpMousePos,
			mx = event.clientX - ige.geometry.x / 2,
			my = event.clientY - ige.geometry.y / 2;

		while (arrCount--) {
			vp = arr[arr.length - (arrCount + 1)];

			// Check if the mouse is inside this viewport's bounds
			if (mx > vp._translate.x - vp.geometry.x / 2 && mx < vp._translate.x + vp.geometry.x / 2) {
				if (my > vp._translate.y - vp.geometry.y / 2 && my < vp._translate.y + vp.geometry.y / 2) {
					// Mouse is inside this viewport
					ige._mousePos.x = (mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x;
					ige._mousePos.y = (my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y;

					gotVpMousePos = true;
					break;
				}
			}
		}

		if (gotVpMousePos) {
			// Emit the event
			ige.emit('mouseMove', event);
		}
	},

	/**
	 * Emits the "mouseWheel" event.
	 * @param event
	 * @private
	 */
	_mouseWheel: function (event) {
		// Emit the event
		this.emit('mouseWheel', event);
	},

	/**
	 * Handles the screen resize event.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		if (ige._autoSize) {
			ige.geometry.x = ige._canvas.width = window.innerWidth;
			ige.geometry.y = ige._canvas.height = window.innerHeight;
			ige.geometry.x2 = window.innerWidth / 2;
			ige.geometry.y2 = window.innerHeight / 2;

			// Loop any mounted children and check if
			// they should also get resized
			var arr = ige._children,
				arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		}
	},

	/**
	 * Is called every second and does things like calculate the current FPS.
	 * @private
	 */
	_secondTick: function () {
		// Store frames per second
		ige._fps = ige._frames;

		// Store draws per second
		ige._dps = ige._dpt * ige._fps;

		// Zero out counters
		ige._frames = 0;
		ige._drawCount = 0;
	},

	/**
	 * Called each frame to traverse and render the scenegraph.
	 */
	tick: function (timeStamp, ctx) {
		if (ige._state) {
			// Check if we were passed a context to work with
			if (ctx === undefined) {
				ctx = ige._ctx;
			}

			// Schedule a new frame
			requestAnimFrame(ige.tick);

			// Alternate the boolean frame alternator flag
			ige._frameAlternator = !ige._frameAlternator;

			// Get the current time in milliseconds
			ige.tickStart = timeStamp;

			// Adjust the tickStart value by the difference between
			// the server and the client clocks (this is only applied
			// when running as the client - the server always has a
			// clientNetDiff of zero)
			ige.tickStart -= ige._clientNetDiff;

			if (!ige.lastTick) {
				// This is the first time we've run so set some
				// default values and set the delta to zero
				ige.lastTick = 0;
				ige.tickDelta = 0;
			} else {
				// Calculate the frame delta
				ige.tickDelta = ige.tickStart - ige.lastTick;
			}

			// Process any behaviours assigned to the engine
			ige._processBehaviours(ctx);

			// Render the scenegraph
			ige.render(ctx);

			// Record the lastTick value so we can
			// calculate delta on the next tick
			ige.lastTick = ige.tickStart;
			ige._frames++;
			ige._dpt = ige._drawCount;
			ige._drawCount = 0;
		}
	},

	render: function (ctx, scene) {
		// Depth-sort the viewports
		if (this._viewportDepth) {
			this.depthSortChildren();
		}

		ctx.save();
		ctx.translate(this.geometry.x2, this.geometry.y2);

		// Process the current engine tick for all child objects
		var arr = this._children,
			arrCount = arr.length;

		// Loop our viewports and call their tick methods
		while (arrCount--) {
			ctx.save();
				arr[arrCount].tick(ctx, scene);
			ctx.restore();
		}

		ctx.restore();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEngine; }