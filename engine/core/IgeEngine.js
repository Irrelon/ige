/**
 * The base engine class definition.
 */
var IgeEngine = IgeEntity.extend({
	classId: 'IgeEngine',

	init: function () {
		this._alwaysInView = true;
		this._super();

		this._id = 'ige';
		this.basePath = '';

		// Determine the environment we are executing in
		this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined');

		// Assign ourselves to the global variable
		ige = this;

		// Output our header
		console.log('------------------------------------------------------------------------------');
		console.log('* Powered by the Isogenic Game Engine ' + igeVersion + '                                  *');
		console.log('* (C)opyright 2012 Irrelon Software Limited                                  *');
		console.log('* http://www.isogenicengine.com                                              *');
		console.log('------------------------------------------------------------------------------');

		// Call super-class method
		this._super();

		// Check if we should add the CocoonJS support component
		if (!this.isServer) {
			// Enable cocoonJS support because we are running native
			this.addComponent(IgeCocoonJsComponent);
		}

		// Create storage
		this.ClassStore = {};
		this.TextureStore = [];

		// Set the initial id as the current time in milliseconds. This ensures that under successive
		// restarts of the engine, new ids will still always be created compared to earlier runs -
		// which is important when storing persistent data with ids etc
		this._idCounter = new Date().getTime();

		// Setup components
		this.addComponent(IgeInputComponent);
		this.addComponent(IgeTweenComponent);

		// Set some defaults
		this._renderModes = [
			'2d',
			'three'
		];

		this._renderContext = '2d'; // The rendering context, default is 2d
		this._renderMode = this._renderModes[this._renderContext]; // Integer representation of the render context
		this._tickTime = 'NA';
		this.tickDelta = 0; // The time between the last tick and the current one
		this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
		this._state = 0; // Currently stopped
		this._textureImageStore = {};
		this._texturesLoading = 0; // Holds a count of currently loading textures
		this._texturesTotal = 0; // Holds total number of textures loading / loaded
		this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
		this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
		this._dps = 0; // Number of draws that occurred last tick
		this._frames = 0; // Number of frames looped through since last second tick
		this._fps = 0; // Number of frames per second
		this._clientNetDiff = 0; // The difference between the server and client comms (only non-zero on clients)
		this._frameAlternator = false; // Is set to the boolean not of itself each frame
		this._viewportDepth = false;
		this._mousePos = new IgePoint(0, 0, 0);
		this._currentViewport = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
		this._currentCamera = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
		this._currentTime = 0; // The current engine time
		this._globalSmoothing = false; // Determines the default smoothing setting for new textures
		this._register = {
			'ige': this
		}; // Holds a reference to every item in the scenegraph by it's ID
		this._postTick = []; // An array of methods that are called upon tick completion
		this._tsit = {}; // An object holding time-spent-in-tick (total time spent in this object's tick method)
		this._tslt = {}; // An object holding time-spent-last-tick (time spent in this object's tick method last tick)
		this._timeScale = 1; // The default time scaling factor to speed up or slow down engine time

		// Set the context to a dummy context to start
		// with in case we are in "headless" mode and
		// a replacement context never gets assigned
		this._ctx = IgeDummyContext;
		this._headless = true;

		this.dependencyTimeout(30000); // Wait 30 seconds to load all dependencies then timeout

		// Add the textures loaded dependency
		this._dependencyQueue.push(this.texturesLoaded);
		//this._dependencyQueue.push(this.canvasReady);

		// Start a timer to record every second of execution
		setInterval(this._secondTick, 1000);
	},

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned.
	 * @param item
	 */
	$: function (item) {
		if (typeof(item) === 'string') {
			return this._register[item];
		} else if (typeof(item) === 'object') {
			return item;
		}

		return this;
	},

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed group name.
	 * @param groupName
	 */
	$$: function (groupName) {
		//TODO
	},

	/**
	 * Register an object with the engine object register. The
	 * register allows you to access an object by it's id with
	 * a call to ige.$(objectId).
	 * @param obj
	 * @return {*}
	 */
	register: function (obj) {
		if (obj !== undefined) {
			if (!this._register[obj.id()]) {
				this._register[obj.id()] = obj;
				obj._registered = true;

				return this;
			} else {
				obj._registered = false;

				this.log('Cannot add object id "' + obj.id() + '" to scenegraph because there is already another object in the graph with the same ID!', 'error');
				return false;
			}
		}

		return this._register;
	},

	unRegister: function (obj) {
		if (obj !== undefined) {
			if (this._register[obj.id()]) {
				delete this._register[obj.id()];
				obj._registered = false;
			}
		}

		return this;
	},

	/**
	 * Sets the frame rate at which new engine ticks are fired.
	 * Setting this rate will override the default requestAnimFrame()
	 * method as defined in IgeBase.js and on the client-side, will
	 * stop usage of any available requestAnimationFrame() method
	 * and will use a setTimeout()-based version instead.
	 * @param {Number} fpsRate
	 */
	setFps: function (fpsRate) {
		if (fpsRate !== undefined) {
			// Override the default requestAnimFrame handler and set
			// our own method up so that we can control the frame rate
			if (this.isServer) {
				// Server-side implementation
				requestAnimFrame = function(callback, element){
					setTimeout(function () { callback(new Date().getTime()); }, 1000 / fpsRate);
				};
			} else {
				// Client-side implementation
				window.requestAnimFrame = function(callback, element){
					setTimeout(function () { callback(new Date().getTime()); }, 1000 / fpsRate);
				};
			}
		}
	},

	/**
	 * Gets / sets the stats output mode that is in use. Set to 1 to
	 * display default stats output at the lower-left of the HTML page.
	 * @param {Number=} val
	 * @param {Number=} interval The number of milliseconds between stats
	 * updates.
	 */
	showStats: function (val, interval) {
		if (val !== undefined) {
			switch (val) {
				case 0:
					clearInterval(this._statsTimer);
					this._removeStatsDiv();
					break;

				case 1:
					this._createStatsDiv();
					if (interval !== undefined) {
						this._statsInterval = interval;
					} else {
						if (this._statsInterval === undefined) {
							this._statsInterval = 16;
						}
					}
					this._statsTimer = setInterval(this._statsTick, this._statsInterval);
					break;
			}

			this._showStats = val;
			return this;
		}

		return this._showStats;
	},

	/**
	 * Creates the stats output div on the DOM.
	 * @private
	 */
	_createStatsDiv: function () {
		if (!ige.isServer) {
			if (!document.getElementById('igeStats')) {
				// Create the stats div
				var div = document.createElement('div');
				div.style.fontFamily = 'Verdana, Tahoma';
				div.style.fontSize = "12px";
				div.style.position = 'absolute';
				div.style.color = '#ffffff';
				div.style.textShadow = '1px 1px 3px #000000';
				div.style.bottom = '10px';
				div.style.left = '10px';
				div.style.userSelect = 'none';
				div.style.webkitUserSelect = 'none';
				div.style.MozkitUserSelect = 'none';
				div.style.zIndex = 100000;
				div.innerHTML = 'Please wait...';

				// Add div to body
				window.addEventListener('load', function () {
					document.body.appendChild(div);
				});

				window.addEventListener('unload', function () {});

				this._statsDiv = div;
			}
		}
	},

	/**
	 * Removes the stats output div from the DOM.
	 * @private
	 */
	_removeStatsDiv: function () {
		document.body.removeChild(this._statsDiv);
		delete this._statsDiv;
	},

	/**
	 * Defines a class in the engine's class repository.
	 * @param {String} id The unique class ID or name.
	 * @param {Object} obj The class definition.
	 */
	defineClass: function (id, obj) {
		ige.ClassStore[id] = obj;
	},

	/**
	 * Retrieves a class by it's ID that was defined with
	 * a call to defineClass().
	 * @param {String} id The ID of the class to retrieve.
	 * @return {Object} The class definition.
	 */
	getClass: function (id) {
		return ige.ClassStore[id];
	},

	/**
	 * Generates a new instance of a class defined with a call
	 * to the defineClass() method. Passes the options
	 * parameter to the new class during it's constructor call.
	 * @param id
	 * @param options
	 * @return {*}
	 */
	newClassInstance: function (id, options) {
		return new ige.ClassStore[id](options);
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
	textureLoadStart: function (url, textureObj) {
		this._texturesLoading++;
		this._texturesTotal++;
		this.emit('textureLoadStart', textureObj);
	},

	/**
	 * Subtracts one from the number of textures currently loading and if no more need
	 * to load, it will also call the _allTexturesLoaded() method.
	 */
	textureLoadEnd: function (url, textureObj) {
		if (!textureObj._destroyed) {
			// Add the texture to the TextureStore array
			this.TextureStore.push(textureObj);
		}

		// Decrement the overall loading number
		this._texturesLoading--;
		this.emit('textureLoadEnd', textureObj);

		// If we've finished...
		if (this._texturesLoading === 0) {
			// All textures have finished loading
			this._allTexturesLoaded();
		}
	},

	/**
	 * Returns a texture from the texture store by it's url.
	 * @param {String} url
	 * @return {IgeTexture}
	 */
	textureFromUrl: function (url) {
		var arr = this.TextureStore,
			arrCount = arr.length,
			item;

		while (arrCount--) {
			item = arr[arrCount];
			if (item._url === url) {
				return item;
			}
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
		if (!this._loggedATL) {
			this._loggedATL = true;
			this.log('All textures have loaded');
		}

		// Fire off an event about this
		this.emit('texturesLoaded');
	},

	/**
	 * Gets / sets the default smoothing value for all new
	 * IgeTexture class instances. If set to true, all newly
	 * created textures will have smoothing enabled by default.
	 * @param val
	 * @return {*}
	 */
	globalSmoothing: function (val) {
		if (val !== undefined) {
			this._globalSmoothing = val;
			return this;
		}

		return this._globalSmoothing;
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
		if (val !== undefined) {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	},

	pixelRatioScaling: function (val) {
		if (val !== undefined) {
			this._pixelRatioScaling = val;
			return this;
		}

		return this._pixelRatioScaling;
	},

	/**
	 * Gets / sets the rendering context that will be used when getting the
	 * context from canvas elements.
	 * @param {String=} contextId The context such as '2d'. Defaults to '2d'.
	 * @return {*}
	 */
	renderContext: function (contextId) {
		if (contextId !== undefined) {
			this._renderContext = contextId;
			this._renderMode = this._renderModes[contextId];

			this.log('Rendering mode set to: ' + contextId);

			return this;
		}

		return this._renderContext;
	},

	/**
	 * Creates a front-buffer or "drawing surface" for the renderer.
	 *
	 * @param {Boolean} autoSize Determines if the canvas will auto-resize
	 * when the browser window changes dimensions. If true the canvas will
	 * automatically fill the window when it is resized.
	 *
	 * @param {Boolean=} dontScale If set to true, IGE will ignore device
	 * pixel ratios when setting the width and height of the canvas and will
	 * therefore not take into account "retina", high-definition displays or
	 * those whose pixel ratio is different from 1 to 1.
	 */
	createFrontBuffer: function (autoSize, dontScale) {
		var self = this;
		if (!this.isServer) {
			if (!this._canvas) {
				this._createdFrontBuffer = true;
				this._pixelRatioScaling = !dontScale;

				this._frontBufferSetup(autoSize, dontScale);
			}
		}
	},

	_frontBufferSetup: function (autoSize, dontScale) {
		// Create a new canvas element to use as the
		// rendering front-buffer
		var tempCanvas = document.createElement('canvas'),
			tempContext,
			width, height;

		if (this._pixelRatioScaling) {
			tempContext = tempCanvas.getContext(ige._renderContext);

			// Support high-definition devices and "retina" (stupid marketing name)
			// displays by adjusting for device and back store pixels ratios
			this._devicePixelRatio = window.devicePixelRatio || 1;
			this._backingStoreRatio = tempContext.webkitBackingStorePixelRatio ||
				tempContext.mozBackingStorePixelRatio ||
				tempContext.msBackingStorePixelRatio ||
				tempContext.oBackingStorePixelRatio ||
				tempContext.backingStorePixelRatio || 1;

			this._deviceFinalDrawRatio = this._devicePixelRatio / this._backingStoreRatio;
		} else {
			// No auto-scaling
			this._devicePixelRatio = 1;
			this._backingStoreRatio = 1;
			this._deviceFinalDrawRatio = 1;
		}

		// Set the canvas element id
		tempCanvas.id = 'igeFrontBuffer';

		this.canvas(tempCanvas, autoSize);
		document.body.appendChild(tempCanvas);
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
			}

			// Fire the resize event for the first time
			// which sets up initial canvas dimensions
			this._resizeEvent();
			this._ctx = this._canvas.getContext(this._renderContext);
			this._headless = false;

			// Ask the input component to setup any listeners it has
			this.input.setupListeners(this._canvas);
		}
	},

	/**
	 * Clears the entire canvas.
	 */
	clearCanvas: function () {
		if (this._ctx) {
			// Clear the whole canvas
			this._ctx.clearRect(
				0,
				0,
				this._canvas.width,
				this._canvas.height
			);
		}
	},

	removeCanvas: function () {
		// Stop listening for input events
		if (this.input) {
			this.input.destroyListeners();
		}

		// If we were auto-sizing, remove event listener
		if (this._autoSize) {
			window.removeEventListener('resize', this._resizeEvent);
		}

		if (this._createdFrontBuffer) {
			// Remove the canvas from the DOM
			document.body.removeChild(this._canvas);
		}

		// Clear internal references
		delete this._canvas;
		delete this._ctx;
		this._ctx = IgeDummyContext;
		this._headless = true;
	},

	/**
	 * Opens a new window to the specified url. When running in a
	 * native wrapper, will load the url in place of any existing
	 * page being displayed in the native web view.
	 * @param url
	 */
	openUrl: function (url) {
		if (url !== undefined) {

			if (ige.cocoonJs && ige.cocoonJs.detected) {
				// Open URL via CocoonJS webview
				ige.cocoonJs.openUrl(url);
			} else {
				// Open via standard JS open window
				window.open(url);
			}
		}
	},

	/**
	 * Loads the specified URL as an HTML overlay on top of the
	 * front buffer in an iFrame. If running in a native wrapper,
	 * will load the url in place of any existing page being
	 * displayed in the native web view.
	 *
	 * When the overlay is in use, no mouse or touch events will
	 * be fired on the front buffer. Once you are finished with the
	 * overlay, call hideOverlay() to re-enable interaction with
	 * the front buffer.
	 * @param {String=} url
	 */
	showWebView: function (url) {
		if (ige.cocoonJs && ige.cocoonJs.detected) {
			// Open URL via CocoonJS webview
			ige.cocoonJs.showWebView(url);
		} else {
			// Load the iFrame url
			var overlay = document.getElementById('igeOverlay');

			if (!overlay) {
				// No overlay was found, create one
				overlay = document.createElement('iframe');

				// Setup overlay styles
				overlay.id = 'igeOverlay';
				overlay.style.position = 'absolute';
				overlay.style.border = 'none';
				overlay.style.left = '0px';
				overlay.style.top = '0px';
				overlay.style.width = '100%';
				overlay.style.height = '100%';

				// Append overlay to body
				document.body.appendChild(overlay);
			}

			// If we have a url, set it now
			if (url !== undefined) {
				overlay.src = url;
			}

			// Show the overlay
			overlay.style.display = 'block';
		}

		return this;
	},

	/**
	 * Hides the web view overlay.
	 * @return {*}
	 */
	hideWebView: function () {
		if (ige.cocoonJs && ige.cocoonJs.detected) {
			// Hide the cocoonJS webview
			ige.cocoonJs.hideWebView();
		} else {
			var overlay = document.getElementById('igeOverlay');
			if (overlay) {
				overlay.style.display = 'none';
			}
		}

		return this;
	},

	/**
	 * Evaluates javascript sent from another frame.
	 * @param js
	 */
	layerCall: function (js) {
		if (js !== undefined) {
			eval(js);
		}
	},

	/**
	 * Returns the mouse position relative to the main front buffer.
	 * @return {IgePoint}
	 */
	mousePos: function () {
		return this._mousePos;
	},

	/**
	 * Handles the screen resize event.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		if (ige._autoSize) {
			var newWidth = window.innerWidth,
				newHeight = window.innerHeight,
				arr = ige._children,
				arrCount = arr.length;

			// Only update canvas dimensions if it exists
			if (ige._canvas) {
				// Make sure we can divide the new width and height by 2...
				// otherwise minus 1 so we get an even number so that we
				// negate the blur effect of sub-pixel rendering
				if (newWidth % 2) { newWidth--; }
				if (newHeight % 2) { newHeight--; }

				ige._canvas.width = newWidth * ige._deviceFinalDrawRatio;
				ige._canvas.height = newHeight * ige._deviceFinalDrawRatio;

				if (ige._deviceFinalDrawRatio !== 1) {
					ige._canvas.style.width = newWidth + 'px';
					ige._canvas.style.height = newHeight + 'px';

					// Scale the canvas context to account for the change
					ige._ctx.scale(ige._deviceFinalDrawRatio, ige._deviceFinalDrawRatio);
				}
			}

			ige.geometry = new IgePoint(newWidth, newHeight, 0);

			// Loop any mounted children and check if
			// they should also get resized
			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		}

		ige._resized = true;
	},

	/**
	 * Adds a new watch expression to the watch list which will be
	 * displayed in the stats overlay during a call to _statsTick().
	 * @param {*} evalStringOrObject The expression to evaluate and
	 * display the result of in the stats overlay, or an object that
	 * contains a "value" property.
	 * @returns {Integer} The index of the new watch expression you
	 * just added to the watch array.
	 */
	watchStart: function (evalStringOrObject) {
		this._watch = this._watch || [];
		this._watch.push(evalStringOrObject);

		return this._watch.length - 1;
	},

	/**
	 * Removes a watch expression by it's array index.
	 * @param {Number} index The index of the watch expression to
	 * remove from the watch array.
	 */
	watchStop: function (index) {
		this._watch = this._watch || [];
		this._watch.splice(index, 1);
	},

	traceSet: function (obj, propName) {
		var currentVal = obj[propName];

		Object.defineProperty(obj, propName, {
			get: function () {
				return currentVal;
			},
			set: function (val) {
				debugger;
				currentVal = val;
			}
		});
	},

	traceSetOff: function (object, propertyName) {
		Object.defineProperty(object, propertyName, {set: this.prototype[propertyName]});
	},

	/**
	 * Is called every second and does things like calculate the current FPS.
	 * @private
	 */
	_secondTick: function () {
		var self = ige;

		// Store frames per second
		self._fps = self._frames;

		// Store draws per second
		self._dps = self._dpt * self._fps;

		// Zero out counters
		self._frames = 0;
		self._drawCount = 0;
	},

	/**
	 * Updates the stats HTML overlay with the latest data.
	 * @private
	 */
	_statsTick: function () {
		var self = ige,
			i,
			watchCount,
			watchItem,
			itemName,
			res,
			html = '';

		// Check if the stats output is enabled
		if (self._showStats && !self._statsPauseUpdate) {
			switch (self._showStats) {
				case 1:
					if (self._watch && self._watch.length) {
						watchCount = self._watch.length;

						for (i = 0; i < watchCount; i++) {
							watchItem = self._watch[i];

							if (typeof(watchItem) === 'string') {
								itemName = watchItem;
								try {
									eval('res = ' + watchItem);
								} catch (err) {
									res = '<span style="color:#ff0000;">' + err + '</span>';
								}
							} else {
								itemName = watchItem.name;
								res = watchItem.value;
							}
							html += i + ' (<a href="javascript:ige.watchStop(' + i + '); ige._statsPauseUpdate = false;" style="color:#cccccc;" onmouseover="ige._statsPauseUpdate = true;" onmouseout="ige._statsPauseUpdate = false;">Remove</a>): <span style="color:#7aff80">' + itemName + '</span>: <span style="color:#00c6ff">' + res + '</span><br />';
						}
						html += '<br />';
					}
					html += '<span class="met" title="Frames Per Second">fps: ' + self._fps + '</span> <span class="met" title="Draws Per Second">dps: ' + self._dps + '</span> <span class="met" title="Draws Per Tick">dpt: ' + self._dpt + '</span> <span class="met" title="Time Spent Processing Tick">tps: ' + self._tickTime + 'ms</span>';

					if (self.network) {
						// Add the network latency too
						html += ' <span class="met" title="Network Latency (Time From Server to This Client)">lat: ' + self.network._latency + 'ms</span>';
					}

					self._statsDiv.innerHTML = html;
					break;
			}
		}
	},

	timeScale: function (val) {
		if (val !== undefined) {
			this._timeScale = val;
			return this;
		}

		return this._timeScale;
	},

	incrementTime: function (val, lastVal) {
		if (!lastVal) { lastVal = val; }
		this._currentTime += ((val - lastVal) * this._timeScale);
		return this._currentTime;
	},

	/**
	 * Called each frame to traverse and render the scenegraph.
	 */
	tick: function (timeStamp, ctx) {
		var st,
			et,
			self = ige,
			ptArr = self._postTick,
			ptCount = ptArr.length,
			ptIndex;

		// Scale the timestamp according to the current
		// engine's time scaling factor
		self.incrementTime(timeStamp, self._timeScaleLastTimestamp);

		self._timeScaleLastTimestamp = timeStamp;
		timeStamp = Math.floor(self._currentTime);

		if (igeDebug.timing) {
			st = new Date().getTime();
		}

		if (self._state) {
			// Check if we were passed a context to work with
			if (ctx === undefined) {
				ctx = self._ctx;
			}

			// Schedule a new frame
			requestAnimFrame(self.tick);

			// Alternate the boolean frame alternator flag
			self._frameAlternator = !self._frameAlternator;

			// Get the current time in milliseconds
			self.tickStart = timeStamp;

			// Adjust the tickStart value by the difference between
			// the server and the client clocks (this is only applied
			// when running as the client - the server always has a
			// clientNetDiff of zero)
			self.tickStart -= self._clientNetDiff;

			if (!self.lastTick) {
				// This is the first time we've run so set some
				// default values and set the delta to zero
				self.lastTick = 0;
				self.tickDelta = 0;
			} else {
				// Calculate the frame delta
				self.tickDelta = self.tickStart - self.lastTick;
			}

			// Process any behaviours assigned to the engine
			self._processBehaviours(ctx);

			// Render the scenegraph
			self.render(ctx);

			// Call post-tick methods
			for (ptIndex = 0; ptIndex < ptCount; ptIndex++) {
				ptArr[ptIndex]();
			}

			// Record the lastTick value so we can
			// calculate delta on the next tick
			self.lastTick = self.tickStart;
			self._frames++;
			self._dpt = self._drawCount;
			self._drawCount = 0;

			// Call the input system tick to reset any flags etc
			self.input.tick();
		}

		self._resized = false;

		if (igeDebug.timing) {
			et = new Date().getTime();
			ige._tickTime = et - st;
		}
	},

	fps: function () {
		return this._fps;
	},

	dpt: function () {
		return this._dpt;
	},

	dps: function () {
		return this._dps;
	},

	render: function (ctx) {
		var ts, td;

		// Depth-sort the viewports
		if (this._viewportDepth) {
			if (igeDebug.timing) {
				ts = new Date().getTime();
				this.depthSortChildren();
				td = new Date().getTime() - ts;

				if (!ige._tslt[this.id()]) {
					ige._tslt[this.id()] = {};
				}

				ige._tslt[this.id()].depthSortChildren = td;
			} else {
				this.depthSortChildren();
			}
		}

		ctx.save();
		ctx.translate(this.geometry.x2, this.geometry.y2);

		// Process the current engine tick for all child objects
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			// Loop our viewports and call their tick methods
			if (igeDebug.timing) {
				while (arrCount--) {
					ctx.save();
					ts = new Date().getTime();
					arr[arrCount].tick(ctx);
					td = new Date().getTime() - ts;
					if (arr[arrCount]) {
						if (!ige._tsit[arr[arrCount].id()]) {
							ige._tsit[arr[arrCount].id()] = 0;
						}

						if (!ige._tslt[arr[arrCount].id()]) {
							ige._tslt[arr[arrCount].id()] = {};
						}

						ige._tsit[arr[arrCount].id()] += td;
						ige._tslt[arr[arrCount].id()].tick = td;
					}
					ctx.restore();
				}
			} else {
				while (arrCount--) {
					ctx.save();
					arr[arrCount].tick(ctx);
					ctx.restore();
				}
			}
		}

		ctx.restore();
	},

	analyseTiming: function () {
		if (igeDebug.timing) {

		} else {
			this.log('Cannot analyse timing because the igeDebug.timing flag is not enabled so no timing data has been recorded!', 'warning');
		}
	},

	/**
	 * Walks the scene graph and outputs a console map of the graph.
	 */
	sceneGraph: function (obj, currentDepth, lastDepth) {
		var depthSpace = '',
			di,
			timingString,
			arr,
			arrCount;

		if (currentDepth === undefined) { currentDepth = 0; }

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		for (di = 0; di < currentDepth; di++) {
			depthSpace += '----';
		}

		if (igeDebug.timing) {
			timingString = '';

			timingString += 'T: ' + ige._tsit[obj.id()];
			if (ige._tslt[obj.id()]) {
				if (typeof(ige._tslt[obj.id()].tick) === 'number') {
					timingString += ' | LastTick: ' + ige._tslt[obj.id()].tick;
				}

				if (typeof(ige._tslt[obj.id()].depthSortChildren) === 'number') {
					timingString += ' | ChildDepthSort: ' + ige._tslt[obj.id()].depthSortChildren;
				}
			}

			console.log(depthSpace + obj.id() + ' (' + obj._classId + ') : ' + obj._inView + ' Timing(' + timingString + ')');
		} else {
			console.log(depthSpace + obj.id() + ' (' + obj._classId + ') : ' + obj._inView);
		}

		currentDepth++;

		if (obj === ige) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					if (arr[arrCount]._scene._shouldRender) {
						if (igeDebug.timing) {
							timingString = '';

							timingString += 'T: ' + ige._tsit[arr[arrCount].id()];
							if (ige._tslt[arr[arrCount].id()]) {
								if (typeof(ige._tslt[arr[arrCount].id()].tick) === 'number') {
									timingString += ' | LastTick: ' + ige._tslt[arr[arrCount].id()].tick;
								}

								if (typeof(ige._tslt[arr[arrCount].id()].depthSortChildren) === 'number') {
									timingString += ' | ChildDepthSort: ' + ige._tslt[arr[arrCount].id()].depthSortChildren;
								}
							}

							console.log(depthSpace + '----' + arr[arrCount].id() + ' (' + arr[arrCount]._classId + ') : ' + arr[arrCount]._inView + ' Timing(' + timingString + ')');
						} else {
							console.log(depthSpace + '----' + arr[arrCount].id() + ' (' + arr[arrCount]._classId + ') : ' + arr[arrCount]._inView);
						}
						this.sceneGraph(arr[arrCount]._scene, currentDepth + 1);
					}
				}
			}
		} else {
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					this.sceneGraph(arr[arrCount], currentDepth);
				}
			}
		}
	},

	/**
	 * Walks the scenegraph and returns a data object of the graph.
	 */
	getSceneGraphData: function (obj) {
		var item, items = [], tempItem, tempItem2, tempItems,
			arr, arrCount;

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		item = {
			text: obj.id() + ' (' + obj._classId + ')',
			parent: obj._parent,
			id: obj.id()
		};

		if (obj === ige) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = {
						text: arr[arrCount].id() + ' (' + arr[arrCount]._classId + ')',
						parent: arr[arrCount]._parent,
						id: arr[arrCount].id()
					};

					if (arr[arrCount]._scene) {
						tempItem2 = this.getSceneGraphData(arr[arrCount]._scene);
						tempItem.items = [tempItem2];
					}

					items.push(tempItem);
				}
			}
		} else {
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = this.getSceneGraphData(arr[arrCount]);
					items.push(tempItem);
				}
			}
		}

		if (items.length > 0) {
			item.items = items;
		}

		return item;
	},

	destroy: function () {
		// Stop the engine and kill any timers
		this.stop();

		// Remove the front buffer (canvas) if we created it
		if (!this.isServer) {
			this.removeCanvas();
		}

		// Call class destroy() super method
		this._super();

		this.log('Engine destroy complete.');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEngine; }