/**
 * The base engine class definition.
 */
var IgeEngine = IgeEntity.extend({
	classId: 'IgeEngine',

	init: function () {
		// Deal with some debug settings first
		if (igeConfig.debug) {
			if (!igeConfig.debug._enabled) {
				// Debug is not enabled so ensure that
				// timing debugs are disabled
				igeConfig.debug._timing = false;
			}
		}

		this._alwaysInView = true;

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
		
		IgeEntity.prototype.init.call(this);

		// Check if we should add the CocoonJS support component
		if (!this.isServer) {
			// Enable cocoonJS support because we are running native
			this.addComponent(IgeCocoonJsComponent);
		}

		// Create storage
		this._textureStore = [];

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
		
		this._requireScriptTotal = 0;
		this._requireScriptLoading = 0;
		this._loadingPreText = undefined; // The text to put in front of the loading percent on the loading progress screen
		this._enableUpdates = true;
		this._enableRenders = true;
		this._showSgTree = false;
		this._debugEvents = {}; // Holds debug event booleans for named events
		this._renderContext = '2d'; // The rendering context, default is 2d
		this._renderMode = this._renderModes[this._renderContext]; // Integer representation of the render context
		this._tickTime = 'NA'; // The time the tick took to process
		this._updateTime = 'NA'; // The time the tick update section took to process
		this._renderTime = 'NA'; // The time the tick render section took to process
		this._tickDelta = 0; // The time between the last tick and the current one
		this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
		this._state = 0; // Currently stopped
		this._textureImageStore = {};
		this._texturesLoading = 0; // Holds a count of currently loading textures
		this._texturesTotal = 0; // Holds total number of textures loading / loaded
		this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
		this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
		this._dps = 0; // Number of draws that occurred last tick
		this._dpt = 0;
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
		this._categoryRegister = {}; // Holds reference to every item with a category
		this._groupRegister = {}; // Holds reference to every item with a group
		this._postTick = []; // An array of methods that are called upon tick completion
		this._timeSpentInUpdate = {}; // An object holding time-spent-in-update (total time spent in this object's update method)
		this._timeSpentLastUpdate = {}; // An object holding time-spent-last-update (time spent in this object's update method last tick)
		this._timeSpentInTick = {}; // An object holding time-spent-in-tick (total time spent in this object's tick method)
		this._timeSpentLastTick = {}; // An object holding time-spent-last-tick (time spent in this object's tick method last tick)
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
		this._secondTimer = setInterval(this._secondTick, 1000);
	},

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned.
	 * @param {String || Object} item The id of the item to return,
	 * or if an object, returns the object as-is.
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
	 * the passed category name.
	 * @param {String} categoryName The name of the category to return
	 * all objects for.
	 */
	$$: function (categoryName) {
		return this._categoryRegister[categoryName] || [];
	},

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed group name.
	 * @param {String} groupName The name of the group to return
	 * all objects for.
	 */
	$$$: function (groupName) {
		return this._groupRegister[groupName] || [];
	},

	/**
	 * Register an object with the engine object register. The
	 * register allows you to access an object by it's id with
	 * a call to ige.$(objectId).
	 * @param {Object} obj The object to register.
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

	/**
	 * Un-register an object with the engine object register. The
	 * object will no longer be accessible via ige.$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	unRegister: function (obj) {
		if (obj !== undefined) {
			// Check if the object is registered in the ID lookup
			if (this._register[obj.id()]) {
				delete this._register[obj.id()];
				obj._registered = false;
			}
		}

		return this;
	},

	/**
	 * Register an object with the engine category register. The
	 * register allows you to access an object by it's category with
	 * a call to ige.$$(categoryName).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	categoryRegister: function (obj) {
		if (obj !== undefined) {
			this._categoryRegister[obj._category] = this._categoryRegister[obj._category] || [];
			this._categoryRegister[obj._category].push(obj);
			obj._categoryRegistered = true;
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine category register. The
	 * object will no longer be accessible via ige.$$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	categoryUnRegister: function (obj) {
		if (obj !== undefined) {
			if (this._categoryRegister[obj._category]) {
				this._categoryRegister[obj._category].pull(obj);
				obj._categoryRegistered = false;
			}
		}

		return this;
	},

	/**
	 * Register an object with the engine group register. The
	 * register allows you to access an object by it's groups with
	 * a call to ige.$$$(groupName).
	 * @param {Object} obj The object to register.
	 * @param {String} groupName The name of the group to register
	 * the object in.
	 * @return {*}
	 */
	groupRegister: function (obj, groupName) {
		if (obj !== undefined) {
			this._groupRegister[groupName] = this._groupRegister[groupName] || [];
			this._groupRegister[groupName].push(obj);
			obj._groupRegistered = true;
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine group register. The
	 * object will no longer be accessible via ige.$$$().
	 * @param {Object} obj The object to un-register.
	 * @param {String} groupName The name of the group to un-register
	 * the object from.
	 * @return {*}
	 */
	groupUnRegister: function (obj, groupName) {
		if (obj !== undefined) {
			if (groupName !== undefined) {
				if (this._groupRegister[groupName]) {
					this._groupRegister[groupName].pull(obj);

					if (!obj.groupCount()) {
						obj._groupRegister = false;
					}
				}
			} else {
				// Call the removeAllGroups() method which will loop
				// all the groups that the object belongs to and
				// automatically un-register them
				obj.removeAllGroups();
			}
		}

		return this;
	},
	
	requireScript: function (url) {
		if (url !== undefined) {
			var self = this;
			
			// Add to the load counter
			self._requireScriptTotal++;
			self._requireScriptLoading++;
			
			// Create the script element
			var elem = document.createElement('script');
			elem.addEventListener('load', function () {
				self._requireScriptLoaded(this);
			});
			
			// For compatibility with CocoonJS
			document.body.appendChild(elem);
			
			// Set the source to load the url
			elem.src = url;
			
			this.emit('requireScriptLoading', url);
		}
	},
	
	_requireScriptLoaded: function (elem) {
		this._requireScriptLoading--;
		
		this.emit('requireScriptLoaded', elem.src);
		
		if (this._requireScriptLoading === 0) {
			// All scripts have loaded, fire the engine event
			this.emit('allRequireScriptsLoaded');
		}
	},

	/**
	 * NOT YET ENABLED - Loads a scenegraph class into memory.
	 * @param {String} className The name of the scenegraph class.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	loadGraph: function (className, options) {
		if (className !== undefined) {
			var classObj = this.getClass(className),
				classInstance;
			
			if (classObj) {
				this.log('Loading SceneGraph data class: ' + className);
				classInstance = this.newClassInstance(className);
				
				// Call the class's graph() method passing the options in
				classInstance.graph(options);
			} else {
				this.log('Cannot load graph for class name "' + className + '" because the class could not be found. Have you included it in your server/clientConfig.js file?', 'error');
			}
		}
		
		return this;
	},

	/**
	 * Allows the update() methods of the entire scenegraph to
	 * be temporarily enabled or disabled. Useful for debugging.
	 * @param {Boolean=} val If false, will disable all update() calls. 
	 * @returns {*}
	 */
	enableUpdates: function (val) {
		if (val !== undefined) {
			this._enableUpdates = val;
			return this;
		}
		
		return this._enableUpdates;
	},

	/**
	 * Allows the tick() methods of the entire scenegraph to
	 * be temporarily enabled or disabled. Useful for debugging.
	 * @param {Boolean=} val If false, will disable all tick() calls. 
	 * @returns {*}
	 */
	enableRenders: function (val) {
		if (val !== undefined) {
			this._enableRenders = val;
			return this;
		}

		return this._enableRenders;
	},

	/**
	 * Enables or disables the engine's debug mode. Enabled by default.
	 * @param {Boolean=} val If true, will enable debug mode. 
	 * @returns {*}
	 */
	debugEnabled: function (val) {
		if (val !== undefined) {
			if (igeConfig.debug) {
				igeConfig.debug._enabled = val;
			}
			return this;
		}

		return igeConfig.debug._enabled;
	},
	
	/**
	 * Enables or disables the engine's debug timing system. The
	 * timing system will time all update and rendering code down
	 * the scenegraph and is useful for tracking long-running code
	 * but comes with a small performance penalty when enabled.
	 * Enabled by default.
	 * @param {Boolean=} val If true, will enable debug timing mode. 
	 * @returns {*}
	 */
	debugTiming: function (val) {
		if (val !== undefined) {
			if (igeConfig.debug) {
				igeConfig.debug._timing = val;
			}
			return this;
		}

		return igeConfig.debug._timing;
	},

	debug: function (eventName) {
		if (this._debugEvents[eventName] === true || this._debugEvents[eventName] === ige._frames) {
			debugger;
		}
	},

	debugEventOn: function (eventName) {
		this._debugEvents[eventName] = true;
	},

	debugEventOff: function (eventName) {
		this._debugEvents[eventName] = false;
	},

	triggerDebugEventFrame: function (eventName) {
		this._debugEvents[eventName] = ige._frames;
	},

	/**
	 * Sets the opacity of every object on the scenegraph to
	 * zero *except* the one specified by the given id argument.
	 * @param {String} id The id of the object not to hide.
	 */
	hideAllExcept: function (id) {
		var i,
			arr = this._register;

		for (i in arr) {
			if (i !== id) {
				arr[i].opacity(0);
			}
		}
	},

	/**
	 * Calls the show() method for every object on the scenegraph.
	 */
	showAll: function () {
		var i,
			arr = this._register;

		for (i in arr) {
			arr[i].show();
		}
	},

	/**
	 * Sets the frame rate at which new engine steps are fired.
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
		if (val !== undefined && (!ige.cocoonJs || !ige.cocoonJs.detected)) {
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
				div.id = 'igeStatsFloater';
				div.className = 'igeStatsFloater';
				div.style.fontFamily = 'Verdana, Tahoma';
				div.style.fontSize = "12px";
				div.style.position = 'absolute';
				div.style.color = '#ffffff';
				div.style.textShadow = '1px 1px 3px #000000';
				div.style.bottom = '4px';
				div.style.left = '4px';
				div.style.userSelect = 'none';
				div.style.webkitUserSelect = 'none';
				div.style.MozUserSelect = 'none';
				div.style.zIndex = 100000;
				div.innerHTML = 'Please wait...';

				// Add div to body
				if (document && document.readyState === 'complete') {
					// The page has already loaded so add div now
					document.body.appendChild(div);
				} else {
					// The page is not loaded yet so add a listener
					window.addEventListener('load', function () {
						document.body.appendChild(div);
					});
				}

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
		igeClassStore[id] = obj;
	},

	/**
	 * Retrieves a class by it's ID that was defined with
	 * a call to defineClass().
	 * @param {String} id The ID of the class to retrieve.
	 * @return {Object} The class definition.
	 */
	getClass: function (id) {
		return igeClassStore[id];
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
		return new igeClassStore[id](options);
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
	 * Updates the loading screen DOM elements to show the update progress.
	 */
	updateProgress: function () {
		// Check for a loading progress bar DOM element
		if (typeof(document) !== 'undefined' && document.getElementById) {
			var elem = document.getElementById('loadingProgressBar'),
				textElem = document.getElementById('loadingText');
			
			if (elem) {
				// Calculate the width from progress
				var totalWidth = parseInt(elem.parentNode.offsetWidth),
					currentWidth = Math.floor((totalWidth / this._texturesTotal) * (this._texturesTotal - this._texturesLoading));
				
				// Set the current bar width
				elem.style.width = currentWidth + 'px';
				
				if (textElem) {
					if (this._loadingPreText === undefined) {
						// Fill the text to use
						this._loadingPreText = textElem.innerHTML;
					}
					textElem.innerHTML = this._loadingPreText + ' ' + Math.floor((100 / this._texturesTotal) * (this._texturesTotal - this._texturesLoading)) + '%';
				}
			}
		}
	},

	/**
	 * Adds one to the number of textures currently loading.
	 */
	textureLoadStart: function (url, textureObj) {
		this._texturesLoading++;
		this._texturesTotal++;
		
		this.updateProgress();
		
		this.emit('textureLoadStart', textureObj);
	},

	/**
	 * Subtracts one from the number of textures currently loading and if no more need
	 * to load, it will also call the _allTexturesLoaded() method.
	 */
	textureLoadEnd: function (url, textureObj) {
		var self = this;
		
		if (!textureObj._destroyed) {
			// Add the texture to the _textureStore array
			this._textureStore.push(textureObj);
		}

		// Decrement the overall loading number
		this._texturesLoading--;
		
		this.updateProgress();
		
		this.emit('textureLoadEnd', textureObj);

		// If we've finished...
		if (this._texturesLoading === 0) {
			// All textures have finished loading
			this.updateProgress();
			
			setTimeout(function () {
				self._allTexturesLoaded();
			}, 100);
		}
	},

	/**
	 * Returns a texture from the texture store by it's url.
	 * @param {String} url
	 * @return {IgeTexture}
	 */
	textureFromUrl: function (url) {
		var arr = this._textureStore,
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
	 * Generates a new 16-character hexadecimal ID based on
	 * the passed string. Will always generate the same ID
	 * for the same string.
	 * @param {String} str A string to generate the ID from.
	 * @return {String}
	 */
	newIdFromString: function (str) {
		if (str !== undefined) {
			var id,
				val = 0,
				count = str.length,
				i;

			for (i = 0; i < count; i++) {
				val += str.charCodeAt(i) * Math.pow(10, 17);
			}

			id = (val).toString(16);

			// Check if the ID is already in use
			while (ige.$(id)) {
				val += Math.pow(10, 17);
				id = (val).toString(16);
			}

			return id;
		}
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

				// Check if we have a DOM, that there is an igeLoading element
				// and if so, remove it from the DOM now
				if (!this.isServer) {
					if (document.getElementsByClassName && document.getElementsByClassName('igeLoading')) {
						var arr = document.getElementsByClassName('igeLoading'),
							arrCount = arr.length;

						while (arrCount--) {
							arr[arrCount].parentNode.removeChild(arr[arrCount]);
						}
					}
				}

				requestAnimFrame(ige.engineStep);

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
		var tempCanvas = document.createElement('canvas');

		// Set the canvas element id
		tempCanvas.id = 'igeFrontBuffer';

		this.canvas(tempCanvas, autoSize);
		document.body.appendChild(tempCanvas);
	},

	/**
	 * Sets the canvas element that will be used as the front-buffer.
	 * @param elem The canvas element.
	 * @param autoSize If set to true, the engine will automatically size
	 * the canvas to the width and height of the window upon window resize.
	 */
	canvas: function (elem, autoSize) {
		if (elem !== undefined) {
			if (!this._canvas) {
				// Setup front-buffer canvas element
				this._canvas = elem;
				this._ctx = this._canvas.getContext(this._renderContext);

				// Handle pixel ratio settings
				if (this._pixelRatioScaling) {
					// Support high-definition devices and "retina" (stupid marketing name)
					// displays by adjusting for device and back store pixels ratios
					this._devicePixelRatio = window.devicePixelRatio || 1;
					this._backingStoreRatio = this._ctx.webkitBackingStorePixelRatio ||
						this._ctx.mozBackingStorePixelRatio ||
						this._ctx.msBackingStorePixelRatio ||
						this._ctx.oBackingStorePixelRatio ||
						this._ctx.backingStorePixelRatio || 1;

					this._deviceFinalDrawRatio = this._devicePixelRatio / this._backingStoreRatio;
				} else {
					// No auto-scaling
					this._devicePixelRatio = 1;
					this._backingStoreRatio = 1;
					this._deviceFinalDrawRatio = 1;
				}

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
		}

		return this._canvas;
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

			ige._geometry = new IgePoint(newWidth, newHeight, 0);

			// Loop any mounted children and check if
			// they should also get resized
			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		} else {
			if (ige._canvas) {
				ige._geometry = new IgePoint(ige._canvas.width, ige._canvas.height, 0);
			}
		}

		if (ige._showSgTree) {
			document.getElementById('igeSgTree').style.height = (ige._geometry.y - 30) + 'px';
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

	/**
	 * Sets a trace up on the setter of the passed object's
	 * specified property. When the property is set by any
	 * code the debugger line is activated and code execution
	 * will be paused allowing you to step through code or
	 * examine the call stack to see where the property set
	 * originated.
	 * @param {Object} obj The object whose property you want
	 * to trace.
	 * @param {String} propName The name of the property you
	 * want to put the trace on.
	 * @param {Number} sampleCount The number of times you
	 * want the trace to break with the debugger line before
	 * automatically switching off the trace.
	 */
	traceSet: function (obj, propName, sampleCount) {
		obj.___igeTraceCurrentVal = obj[propName];
		obj.___igeTraceMax = sampleCount || 1;
		obj.___igeTraceCount = 0;

		Object.defineProperty(obj, propName, {
			get: function () {
				return this.___igeTraceCurrentVal;
			},
			set: function (val) {
				debugger;
				this.___igeTraceCurrentVal = val;
				this.___igeTraceCount++;

				if (this.___igeTraceCount === this.___igeTraceMax) {
					// Maximum amount of trace samples reached, turn off
					// the trace system
					ige.traceSetOff(obj, propName);
				}
			}
		});
	},

	/**
	 * Turns off a trace that was created by calling traceSet.
	 * @param {Object} object The object whose property you want
	 * to disable a trace against.
	 * @param {String} propName The name of the property you
	 * want to disable the trace for.
	 */
	traceSetOff: function (object, propName) {
		Object.defineProperty(object, propName, {set: function (val) { this.___igeTraceCurrentVal = val; }});
	},

	/**
	 * Finds the first Ige* based class that the passed object
	 * has been derived from.
	 * @param obj
	 * @return {*}
	 */
	findBaseClass: function (obj) {
		if (obj._classId.substr(0, 3) === 'Ige') {
			return obj._classId;
		} else {
			if (obj.__proto__._classId) { 
				return this.findBaseClass(obj.__proto__);
			} else {
				return '';
			}
		}
	},

	/**
	 * Returns an array of all classes the passed object derives from
	 * in order from base to current.
	 * @param obj
	 * @param arr
	 * @return {*}
	 */
	getClassDerivedList: function (obj, arr) {
		if (!arr) {
			arr = [];
		} else {
			if (obj._classId) {
				arr.push(obj._classId);
			}
		}
		
		if (obj.__proto__._classId) {
			this.getClassDerivedList(obj.__proto__, arr);
		}
		
		return arr;
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

	addToSgTree: function (item) {
		var elem = document.createElement('li'),
			arr,
			arrCount,
			i,
			mouseUp,
			dblClick,
			timingString;

		mouseUp = function (event) {
			event.stopPropagation();

			var elems = document.getElementsByClassName('sgItem selected');
			for (i = 0; i < elems.length; i++) {
				elems[i].className = 'sgItem';
			}

			this.className += ' selected';
			ige._sgTreeSelected = this.id;

			ige._currentViewport.drawBounds(true);
			if (this.id !== 'ige') {
				ige._currentViewport.drawBoundsLimitId(this.id);
			} else {
				ige._currentViewport.drawBoundsLimitId('');
			}
		};

		dblClick = function (event) {
			event.stopPropagation();
			var console = document.getElementById('igeSgConsole'),
				obj = ige.$(this.id),
				classId = ige.findBaseClass(obj),
				derivedArr,
				classList = '',
				i;

			console.value += "ige.$('" + this.id + "')";
			
			if (classId) {
				// The class is a native engine class so show the doc manual page for it
				document.getElementById('igeSgDocPage').style.display = 'block';
				document.getElementById('igeSgDocPage').src = 'http://www.isogenicengine.com/engine/documentation/root/' + classId + '.html';
				
				derivedArr = ige.getClassDerivedList(obj);
				derivedArr.reverse();
				
				// Build a class breadcrumb
				for (i in derivedArr) {
					if (derivedArr.hasOwnProperty(i)) {
						if (classList) {
							classList += ' &gt ';
						}
						
						if (derivedArr[i].substr(0, 3) === 'Ige') {
							classList += '<a href="' + 'http://www.isogenicengine.com/engine/documentation/root/' + derivedArr[i] + '.html" target="igeSgDocPage">' + derivedArr[i] + '</a>';
						} else {
							classList += derivedArr[i];
						}
					}
				}
				
				// Show the derived class list
				document.getElementById('igeSgItemClassChain').innerHTML = '<B>Inheritance</B>: ' + classList;
				document.getElementById('igeSgItemClassChain').style.display = 'block';
			} else {
				// Not a native class, hide the doc page
				document.getElementById('igeSgItemClassChain').style.display = 'none';
				document.getElementById('igeSgDocPage').style.display = 'none';
			}
		};

		//elem.addEventListener('mouseover', mouseOver, false);
		//elem.addEventListener('mouseout', mouseOut, false);
		elem.addEventListener('mouseup', mouseUp, false);
		elem.addEventListener('dblclick', dblClick, false);

		elem.id = item.id;
		elem.innerHTML = item.text;
		elem.className = 'sgItem';

		if (ige._sgTreeSelected === item.id) {
			elem.className += ' selected';
		}

		if (igeConfig.debug._timing) {
			if (ige._timeSpentInTick[item.id]) {
				timingString = '<span>' + ige._timeSpentInTick[item.id] + 'ms</span>';
				/*if (ige._timeSpentLastTick[item.id]) {
					if (typeof(ige._timeSpentLastTick[item.id].ms) === 'number') {
						timingString += ' | LastTick: ' + ige._timeSpentLastTick[item.id].ms;
					}
				}*/

				elem.innerHTML += ' ' + timingString;
			}
		}

		document.getElementById(item.parentId + '_items').appendChild(elem);

		if (item.items) {
			// Create a ul inside the li
			elem = document.createElement('ul');
			elem.id = item.id + '_items';
			document.getElementById(item.id).appendChild(elem);

			arr = item.items;
			arrCount = arr.length;

			for (i = 0; i < arrCount; i++) {
				ige.addToSgTree(arr[i]);
			}
		}
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
					html += '<div class="sgButton" title="Show / Hide SceneGraph Tree" onmouseup="ige.toggleShowSceneGraph();">Scene</div> <span class="met" title="Frames Per Second">' + self._fps + ' fps</span> <span class="met" title="Draws Per Second">' + self._dps + ' dps</span> <span class="met" title="Draws Per Tick">' + self._dpt + ' dpt</span> <span class="met" title="Update Delta (How Long the Last Update Took)">' + self._updateTime + ' ms\/ud</span> <span class="met" title="Render Delta (How Long the Last Render Took)">' + self._renderTime + ' ms\/rd</span> <span class="met" title="Tick Delta (How Long the Last Tick Took)">' + self._tickTime + ' ms\/pt</span>';

					if (self.network) {
						// Add the network latency too
						html += ' <span class="met" title="Network Latency (Time From Server to This Client)">' + self.network._latency + ' ms\/net</span>';
					}

					self._statsDiv.innerHTML = html;
					break;
			}
		}
	},

	toggleShowSceneGraph: function () {
		this._showSgTree = !this._showSgTree;

		if (this._showSgTree) {
			// Create the scenegraph tree
			var self = this,
				elem1 = document.createElement('div'),
				elem2;

			elem1.id = 'igeSgTree';
			elem1.style.height = (ige._geometry.y - 30) + 'px';
			elem1.style.overflow = 'auto';
			elem1.addEventListener('mousemove', function (event) {
				event.stopPropagation();
			});
			elem1.addEventListener('mouseup', function (event) {
				event.stopPropagation();
			});
			elem1.addEventListener('mousedown', function (event) {
				event.stopPropagation();
			});

			elem2 = document.createElement('ul');
			elem2.id = 'sceneGraph_items';
			elem1.appendChild(elem2);

			document.body.appendChild(elem1);
			
			// Create the IGE console
			var consoleHolderElem = document.createElement('div'),
				consoleElem = document.createElement('input'),
				classChainElem = document.createElement('div'),
				dociFrame = document.createElement('iframe');

			consoleHolderElem.id = 'igeSgConsoleHolder';
			consoleHolderElem.innerHTML = '<div><b>Console</b>: Double-Click a SceneGraph Object to Script it Here</div>';
			
			consoleElem.type = 'text';
			consoleElem.id = 'igeSgConsole';
			
			classChainElem.id = 'igeSgItemClassChain';

			dociFrame.id = 'igeSgDocPage';
			dociFrame.name = 'igeSgDocPage';

			consoleHolderElem.appendChild(consoleElem);
			consoleHolderElem.appendChild(classChainElem);
			consoleHolderElem.appendChild(dociFrame);
			
			document.body.appendChild(consoleHolderElem);

			this.sgTreeUpdate();
			
			// Now finally, add a refresh button to the scene button
			var button = document.createElement('input');
			button.type = 'button';
			button.id = 'igeSgRefreshTree'
			button.style.position = 'absolute';
			button.style.top = '0px';
			button.style.right = '0px'
			button.value = 'Refresh';
			
			button.addEventListener('click', function () {
				self.sgTreeUpdate();
			}, false);
			
			document.getElementById('igeSgTree').appendChild(button);
		} else {
			var child = document.getElementById('igeSgTree');
			child.parentNode.removeChild(child);

			child = document.getElementById('igeSgConsoleHolder');
			child.parentNode.removeChild(child);
		}
	},
	
	sgTreeUpdate: function () {
		// Update the scenegraph tree
		document.getElementById('sceneGraph_items').innerHTML = '';

		// Get the scenegraph data
		this.addToSgTree(this.getSceneGraphData(this, true));
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
	 * Get the current time from the engine.
	 * @return {Number} The current time.
	 */
	currentTime: function () {
		return this._currentTime;
	},

	/**
	 * Gets / sets the option to determine if the engine should
	 * schedule it's own ticks or if you want to manually advance
	 * the engine by calling tick when you wish to.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	useManualTicks: function (val) {
		if (val !== undefined) {
			this._useManualTicks = val;
			return this;
		}

		return this._useManualTicks;
	},

	/**
	 * Schedules a manual tick.
	 */
	manualTick: function () {
		if (this._manualFrameAlternator !== this._frameAlternator) {
			this._manualFrameAlternator = this._frameAlternator;
			requestAnimFrame(this.engineStep);
		}
	},

	/**
	 * Gets / sets the option to determine if the engine should
	 * render on every tick or wait for a manualRender() call.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	useManualRender: function (val) {
		if (val !== undefined) {
			this._useManualRender = val;
			return this;
		}

		return this._useManualRender;
	},

	manualRender: function () {
		this._manualRender = true;
	},

	/**
	 * Called each frame to traverse and render the scenegraph.
	 */
	engineStep: function (timeStamp, ctx) {
		/* TODO:
			Make the scenegraph process simplified. Walk the scenegraph once and grab the order in a flat array
			then process updates and ticks. This will also allow a layered rendering system that can render the
			first x number of entities then stop, allowing a step through of the renderer in realtime
		 */
		var st,
			et,
			updateStart,
			renderStart,
			self = ige,
			ptArr = self._postTick,
			ptCount = ptArr.length,
			ptIndex;

		// Scale the timestamp according to the current
		// engine's time scaling factor
		self.incrementTime(timeStamp, self._timeScaleLastTimestamp);

		self._timeScaleLastTimestamp = timeStamp;
		timeStamp = Math.floor(self._currentTime);

		if (igeConfig.debug._timing) {
			st = new Date().getTime();
		}

		if (self._state) {
			// Check if we were passed a context to work with
			if (ctx === undefined) {
				ctx = self._ctx;
			}

			// Alternate the boolean frame alternator flag
			self._frameAlternator = !self._frameAlternator;

			// If the engine is not in manual tick mode...
			if (!ige._useManualTicks) {
				// Schedule a new frame
				requestAnimFrame(self.engineStep);
			} else {
				self._manualFrameAlternator = !self._frameAlternator;
			}

			// Get the current time in milliseconds
			self._tickStart = timeStamp;

			// Adjust the tickStart value by the difference between
			// the server and the client clocks (this is only applied
			// when running as the client - the server always has a
			// clientNetDiff of zero)
			self._tickStart -= self._clientNetDiff;

			if (!self.lastTick) {
				// This is the first time we've run so set some
				// default values and set the delta to zero
				self.lastTick = 0;
				self._tickDelta = 0;
			} else {
				// Calculate the frame delta
				self._tickDelta = self._tickStart - self.lastTick;
			}

			// Update the scenegraph
			if (self._enableUpdates) {
				if (igeConfig.debug._timing) {
					updateStart = new Date().getTime();
					self.updateSceneGraph(ctx);
					ige._updateTime = new Date().getTime() - updateStart;
				} else {
					self.updateSceneGraph(ctx);
				}
			}
			
			// Render the scenegraph
			if (self._enableRenders) {
				if (!self._useManualRender) {
					if (igeConfig.debug._timing) {
						renderStart = new Date().getTime();
						self.renderSceneGraph(ctx);
						ige._renderTime = new Date().getTime() - renderStart;
					} else {
						self.renderSceneGraph(ctx);
					}
				} else {
					if (self._manualRender) {
						if (igeConfig.debug._timing) {
							renderStart = new Date().getTime();
							self.renderSceneGraph(ctx);
							ige._renderTime = new Date().getTime() - renderStart;
						} else {
							self.renderSceneGraph(ctx);
						}
						self._manualRender = false;
					}
				}
			}

			// Call post-tick methods
			for (ptIndex = 0; ptIndex < ptCount; ptIndex++) {
				ptArr[ptIndex]();
			}

			// Record the lastTick value so we can
			// calculate delta on the next tick
			self.lastTick = self._tickStart;
			self._frames++;
			self._dpt = self._drawCount;
			self._drawCount = 0;

			// Call the input system tick to reset any flags etc
			self.input.tick();
		}

		self._resized = false;

		if (igeConfig.debug._timing) {
			et = new Date().getTime();
			ige._tickTime = et - st;
		}
	},
	
	updateSceneGraph: function (ctx) {
		var arr = this._children,
			arrCount, us, ud;

		// Process any behaviours assigned to the engine
		this._processUpdateBehaviours(ctx);

		if (arr) {
			arrCount = arr.length;

			// Loop our viewports and call their update methods
			if (igeConfig.debug._timing) {
				while (arrCount--) {
					us = new Date().getTime();
					arr[arrCount].update(ctx);
					ud = new Date().getTime() - us;
					
					if (arr[arrCount]) {
						if (!ige._timeSpentInUpdate[arr[arrCount].id()]) {
							ige._timeSpentInUpdate[arr[arrCount].id()] = 0;
						}

						if (!ige._timeSpentLastUpdate[arr[arrCount].id()]) {
							ige._timeSpentLastUpdate[arr[arrCount].id()] = {};
						}

						ige._timeSpentInUpdate[arr[arrCount].id()] += ud;
						ige._timeSpentLastUpdate[arr[arrCount].id()].ms = ud;
					}
				}
			} else {
				while (arrCount--) {
					arr[arrCount].update(ctx);
				}
			}
		}
	},

	renderSceneGraph: function (ctx) {
		var ts, td;

		// Process any behaviours assigned to the engine
		this._processTickBehaviours(ctx);

		// Depth-sort the viewports
		if (this._viewportDepth) {
			if (igeConfig.debug._timing) {
				ts = new Date().getTime();
				this.depthSortChildren();
				td = new Date().getTime() - ts;

				if (!ige._timeSpentLastTick[this.id()]) {
					ige._timeSpentLastTick[this.id()] = {};
				}

				ige._timeSpentLastTick[this.id()].depthSortChildren = td;
			} else {
				this.depthSortChildren();
			}
		}

		ctx.save();
		ctx.translate(this._geometry.x2, this._geometry.y2);

		// Process the current engine tick for all child objects
		var arr = this._children,
			arrCount;

		if (arr) {
			arrCount = arr.length;

			// Loop our viewports and call their tick methods
			if (igeConfig.debug._timing) {
				while (arrCount--) {
					ctx.save();
					ts = new Date().getTime();
					arr[arrCount].tick(ctx);
					td = new Date().getTime() - ts;
					if (arr[arrCount]) {
						if (!ige._timeSpentInTick[arr[arrCount].id()]) {
							ige._timeSpentInTick[arr[arrCount].id()] = 0;
						}

						if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
							ige._timeSpentLastTick[arr[arrCount].id()] = {};
						}

						ige._timeSpentInTick[arr[arrCount].id()] += td;
						ige._timeSpentLastTick[arr[arrCount].id()].ms = td;
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

	fps: function () {
		return this._fps;
	},

	dpt: function () {
		return this._dpt;
	},

	dps: function () {
		return this._dps;
	},

	analyseTiming: function () {
		if (igeConfig.debug._timing) {

		} else {
			this.log('Cannot analyse timing because the igeConfig.debug._timing flag is not enabled so no timing data has been recorded!', 'warning');
		}
	},

	saveSceneGraph: function (item) {
		var arr, arrCount, i;

		if (!item) {
			item = this.getSceneGraphData();
		}

		if (item.obj.stringify) {
			item.str = item.obj.stringify();
		} else {
			console.log('Class ' + item.classId + ' has no stringify() method! For object: ' + item.id, item.obj);
		}
		arr = item.items;

		if (arr) {
			arrCount = arr.length;

			for (i = 0; i < arrCount; i++) {
				this.saveSceneGraph(arr[i]);
			}
		}

		return item;
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

		if (igeConfig.debug._timing) {
			timingString = '';

			timingString += 'T: ' + ige._timeSpentInTick[obj.id()];
			if (ige._timeSpentLastTick[obj.id()]) {
				if (typeof(ige._timeSpentLastTick[obj.id()].ms) === 'number') {
					timingString += ' | LastTick: ' + ige._timeSpentLastTick[obj.id()].ms;
				}

				if (typeof(ige._timeSpentLastTick[obj.id()].depthSortChildren) === 'number') {
					timingString += ' | ChildDepthSort: ' + ige._timeSpentLastTick[obj.id()].depthSortChildren;
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
						if (igeConfig.debug._timing) {
							timingString = '';

							timingString += 'T: ' + ige._timeSpentInTick[arr[arrCount].id()];
							if (ige._timeSpentLastTick[arr[arrCount].id()]) {
								if (typeof(ige._timeSpentLastTick[arr[arrCount].id()].ms) === 'number') {
									timingString += ' | LastTick: ' + ige._timeSpentLastTick[arr[arrCount].id()].ms;
								}

								if (typeof(ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren) === 'number') {
									timingString += ' | ChildDepthSort: ' + ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren;
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
	getSceneGraphData: function (obj, noRef) {
		var item, items = [], tempItem, tempItem2, tempItems,
			arr, arrCount;

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		item = {
			text: obj.id() + ' (' + obj._classId + ')',
			id: obj.id(),
			classId: obj.classId()
		};

		if (!noRef) {
			item.parent = obj._parent;
			item.obj = obj;
		} else {
			if (obj._parent) {
				item.parentId = obj._parent.id();
			} else {
				item.parentId = 'sceneGraph';
			}
		}

		if (obj === ige) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = {
						text: arr[arrCount].id() + ' (' + arr[arrCount]._classId + ')',
						id: arr[arrCount].id(),
						classId: arr[arrCount].classId()
					};

					if (!noRef) {
						tempItem.parent = arr[arrCount]._parent;
						tempItem.obj = arr[arrCount];
					} else {
						if (arr[arrCount]._parent) {
							tempItem.parentId = arr[arrCount]._parent.id();
						}
					}

					if (arr[arrCount]._scene) {
						tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
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
					tempItem = this.getSceneGraphData(arr[arrCount], noRef);
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
		IgeEntity.prototype.destroy.call(this);

		this.log('Engine destroy complete.');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEngine; }