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
		this.isClient = !this.isServer;

		// Assign ourselves to the global variable
		ige = this;

		// Output our header
		console.log('------------------------------------------------------------------------------');
		console.log('* Powered by the Isogenic Game Engine ' + igeVersion + '                  *');
		console.log('* (C)opyright ' + new Date().getFullYear() + ' Irrelon Software Limited                                  *');
		console.log('* http://www.isogenicengine.com                                              *');
		console.log('------------------------------------------------------------------------------');
		
		IgeEntity.prototype.init.call(this);

		// Check if we are running client-side
		if (this.isClient) {
			// Enable cocoonJS support because we are running client-side
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
		this.addComponent(IgeTimeComponent);
		
		if (this.isClient) {
			// Enable UI element (virtual DOM) support
			this.addComponent(IgeUiManagerComponent);
		}

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
		this._dpf = 0;
		this._frames = 0; // Number of frames looped through since last second tick
		this._fps = 0; // Number of frames per second
		this._clientNetDiff = 0; // The difference between the server and client comms (only non-zero on clients)
		this._frameAlternator = false; // Is set to the boolean not of itself each frame
		this._viewportDepth = false;
		this._mousePos = new IgePoint3d(0, 0, 0);
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
		this._globalScale = new IgePoint3d(1, 1, 1);
		this._graphInstances = []; // Holds an array of instances of graph classes
		this._spawnQueue = []; // Holds an array of entities that are yet to be born

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
		return this._categoryRegister[categoryName] || new IgeArray();
	},

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed group name.
	 * @param {String} groupName The name of the group to return
	 * all objects for.
	 */
	$$$: function (groupName) {
		return this._groupRegister[groupName] || new IgeArray();
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
			this._categoryRegister[obj._category] = this._categoryRegister[obj._category] || new IgeArray();
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
			this._groupRegister[groupName] = this._groupRegister[groupName] || new IgeArray();
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
	
	sync: function (method, attrArr) {
		if (typeof(attrArr) === 'string') {
			attrArr = [attrArr];
		}
		
		this._syncArr = this._syncArr || [];
		this._syncArr.push({method: method, attrArr: attrArr});
		
		if (this._syncArr.length === 1) {
			// Start sync waterfall
			this._syncIndex = 0;
			this._processSync();
		}
	},
	
	_processSync: function () {
		var syncEntry;
		
		if (ige._syncIndex < ige._syncArr.length) {
			syncEntry = ige._syncArr[ige._syncIndex];
			
			// Add the callback to the last attribute
			syncEntry.attrArr.push(function () {
				ige._syncIndex++;
				setTimeout(ige._processSync, 1);
			});
			
			// Call the method
			syncEntry.method.apply(ige, syncEntry.attrArr);
		} else {
			// Reached end of sync cycle
			delete ige._syncArr;
			delete ige._syncIndex;
			
			ige.emit('syncComplete');
		}
	},

	/**
	 * Load a js script file into memory via a path or url. 
	 * @param {String} url The file's path or url.
	 * @param {Function=} callback Optional callback when script loads.
	 */
	requireScript: function (url, callback) {
		if (url !== undefined) {
			var self = this;
			
			// Add to the load counter
			self._requireScriptTotal++;
			self._requireScriptLoading++;
			
			// Create the script element
			var elem = document.createElement('script');
			elem.addEventListener('load', function () {
				self._requireScriptLoaded(this);
				
				if (callback) {
					setTimeout(function () { callback(); }, 100);
				}
			});
			
			// For compatibility with CocoonJS
			document.body.appendChild(elem);
			
			// Set the source to load the url
			elem.src = url;
			
			this.log('Loading script from: ' + url);
			this.emit('requireScriptLoading', url);
		}
	},

	/**
	 * Called when a js script has been loaded via the requireScript
	 * method.
	 * @param {Element} elem The script element added to the DOM.
	 * @private
	 */
	_requireScriptLoaded: function (elem) {
		this._requireScriptLoading--;
		
		this.emit('requireScriptLoaded', elem.src);
		
		if (this._requireScriptLoading === 0) {
			// All scripts have loaded, fire the engine event
			this.emit('allRequireScriptsLoaded');
		}
	},
	
	/**
	 * Load a css style file into memory via a path or url. 
	 * @param {String} url The file's path or url.
	 */
	requireStylesheet: function (url) {
		if (url !== undefined) {
			var self = this;
			
			// Load the engine stylesheet
			var css = document.createElement('link');
			css.rel = 'stylesheet';
			css.type = 'text/css';
			css.media = 'all';
			css.href = url;
			
			document.getElementsByTagName('head')[0].appendChild(css);
			
			this.log('Load css stylesheet from: ' + url);
		}
	},

	/**
	 * Adds a scenegraph class into memory.
	 * @param {String} className The name of the scenegraph class.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	addGraph: function (className, options) {
		if (className !== undefined) {
			var classObj = this.getClass(className),
				classInstance;
			
			if (classObj) {
				this.log('Loading SceneGraph data class: ' + className);
				classInstance = this.newClassInstance(className);
				
				// Make sure the graph class implements the required methods "addGraph" and "removeGraph"
				if (typeof(classInstance.addGraph) === 'function' && typeof(classInstance.removeGraph) === 'function') {
					// Call the class's graph() method passing the options in
					classInstance.addGraph(options);
					
					// Add the graph instance to the holding array
					this._graphInstances[className] = classInstance;
				} else {
					this.log('Could not load graph for class name "' + className + '" because the class does not implement both the require methods "addGraph()" and "removeGraph()".', 'error');
				}
			} else {
				this.log('Cannot load graph for class name "' + className + '" because the class could not be found. Have you included it in your server/clientConfig.js file?', 'error');
			}
		}
		
		return this;
	},
	
	/**
	 * Removes a scenegraph class into memory.
	 * @param {String} className The name of the scenegraph class.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	removeGraph: function (className, options) {
		if (className !== undefined) {
			var classInstance = this._graphInstances[className];
			
			if (classInstance) {
				this.log('Removing SceneGraph data class: ' + className);
				
				// Call the class's graph() method passing the options in
				classInstance.removeGraph(options);
				
				// Now remove the graph instance from the graph instance array
				delete this._graphInstances[className];
			} else {
				this.log('Cannot remove graph for class name "' + className + '" because the class instance could not be found. Did you add it via ige.addGraph() ?', 'error');
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

	showStats: function () {
		this.log('showStats has been removed from the ige in favour of the new editor component, please remove this call from your code.');
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
	 * Returns true if the class specified has been defined.
	 * @param {String} id The ID of the class to check for.
	 * @returns {*}
	 */
	classDefined: function (id) {
		return Boolean(igeClassStore[id]);
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
				if (this.isClient) {
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
		if (this.isClient) {
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
				}
				
				// Add some event listeners even if autosize is off
				window.addEventListener('resize', this._resizeEvent);

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

	/**
	 * Removes the engine's canvas from the DOM.
	 */
	removeCanvas: function () {
		// Stop listening for input events
		if (this.input) {
			this.input.destroyListeners();
		}

		// Remove event listener
		window.removeEventListener('resize', this._resizeEvent);

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
	 * Returns the mouse position relative to the main front buffer. Mouse
	 * position is set by the ige.input component (IgeInputComponent)
	 * @return {IgePoint3d}
	 */
	mousePos: function () {
		return this._mousePos.clone();
	},

	/**
	 * Walks the scenegraph and returns an array of all entities that the mouse
	 * is currently over, ordered by their draw order from drawn last (above other
	 * entities) to first (underneath other entities).
	 */
	mouseOverList: function (obj, entArr) {
		var arr,
			arrCount,
			mp,
			mouseTriggerPoly,
			first = false;
		
		if (!obj) {
			obj = ige;
			entArr = [];
			first = true;
		}
		
		if (obj === ige) {
			// Loop viewports
			arr = obj._children;
	
			if (arr) {
				arrCount = arr.length;
	
				// Loop our children
				while (arrCount--) {
					if (arr[arrCount]._scene) {
						if (arr[arrCount]._scene._shouldRender) {
							this.mouseOverList(arr[arrCount]._scene, entArr);
						}
					}
				}
			}
		} else {
			// Check if the mouse is over this entity
			mp = this.mousePosWorld();

			if (mp && obj.aabb) {
				// Trigger mode is against the AABB
				mouseTriggerPoly = obj.aabb(); //this.localAabb();
				
				// Check if the current mouse position is inside this aabb
				if (mouseTriggerPoly.xyInside(mp.x, mp.y)) {
					entArr.push(obj);
				}
			}
			
			// Check if the entity has children
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					this.mouseOverList(arr[arrCount], entArr);
				}
			}
		}
		
		if (first) {
			entArr.reverse();
		}
		
		return entArr;
	},

	/**
	 * Handles the screen resize event.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		var canvasBoundingRect;
		
		if (ige._autoSize) {
			var newWidth = window.innerWidth,
				newHeight = window.innerHeight,
				arr = ige._children,
				arrCount = arr.length;

			// Only update canvas dimensions if it exists
			if (ige._canvas) {
				// Check if we can get the position of the canvas
				canvasBoundingRect = ige._canvasPosition();
				
				// Adjust the newWidth and newHeight by the canvas offset
				newWidth -= parseInt(canvasBoundingRect.left);
				newHeight -= parseInt(canvasBoundingRect.top);
				
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

			ige._bounds2d = new IgePoint3d(newWidth, newHeight, 0);

			// Loop any mounted children and check if
			// they should also get resized
			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		} else {
			if (ige._canvas) {
				ige._bounds2d = new IgePoint3d(ige._canvas.width, ige._canvas.height, 0);
			}
		}

		if (ige._showSgTree) {
			var sgTreeElem = document.getElementById('igeSgTree');
							
			canvasBoundingRect = ige._canvasPosition();
			
			sgTreeElem.style.top = (parseInt(canvasBoundingRect.top) + 5) + 'px';
			sgTreeElem.style.left = (parseInt(canvasBoundingRect.left) + 5) + 'px';
			sgTreeElem.style.height = (ige._bounds2d.y - 30) + 'px';
		}

		ige._resized = true;
	},

	/**
	 * Gets the bounding rectangle for the HTML canvas element being
	 * used as the front buffer for the engine. Uses DOM methods.
	 * @returns {ClientRect}
	 * @private
	 */
	_canvasPosition: function () {
		try {
			return ige._canvas.getBoundingClientRect();
		} catch (e) {
			return {
				top: ige._canvas.offsetTop,
				left: ige._canvas.offsetLeft
			};
		}
	},

	/**
	 * Toggles full-screen output of the main ige canvas. Only works
	 * if called from within a user-generated HTML event listener.
	 */
	toggleFullScreen: function () {
		var elem = this._canvas;
		
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		} else if (elem.mozRequestFullScreen) {
			elem.mozRequestFullScreen();
		} else if (elem.webkitRequestFullscreen) {
			elem.webkitRequestFullscreen();
		}
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
	 * @param {Function=} callbackEvaluator Optional callback
	 * that if returns true, will fire debugger. Method is passed
	 * the setter value as first argument.
	 */
	traceSet: function (obj, propName, sampleCount, callbackEvaluator) {
		obj.___igeTraceCurrentVal = obj.___igeTraceCurrentVal || {};
		obj.___igeTraceCurrentVal[propName] = obj[propName];
		obj.___igeTraceMax = sampleCount || 1;
		obj.___igeTraceCount = 0;

		Object.defineProperty(obj, propName, {
			get: function () {
				return obj.___igeTraceCurrentVal[propName];
			},
			set: function (val) {
				if (callbackEvaluator){ 
					if (callbackEvaluator(val)) {
						debugger;
					}
				} else {
					debugger;
				}
				
				obj.___igeTraceCurrentVal[propName] = val;
				obj.___igeTraceCount++;

				if (obj.___igeTraceCount === obj.___igeTraceMax) {
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
		Object.defineProperty(object, propName, {set: function (val) { this.___igeTraceCurrentVal[propName] = val; }});
	},

	/**
	 * Finds the first Ige* based class that the passed object
	 * has been derived from.
	 * @param obj
	 * @return {*}
	 */
	findBaseClass: function (obj) {
		if (obj && obj._classId) {
			if (obj._classId.substr(0, 3) === 'Ige') {
				return obj._classId;
			} else {
				if (obj.__proto__._classId) { 
					return this.findBaseClass(obj.__proto__);
				} else {
					return '';
				}
			}
		} else {
			return '';
		}
	},

	/**
	 * Returns an array of all classes the passed object derives from
	 * in order from current to base.
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
	
	spawnQueue: function (ent) {
		if (ent !== undefined) {
			this._spawnQueue.push(ent);
			return this;
		}
		
		return this._spawnQueue;
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
		self._dps = self._dpf * self._fps;

		// Zero out counters
		self._frames = 0;
		self._drawCount = 0;
	},
	
	/**
	 * Gets / sets the current time scalar value. The engine's internal
	 * time is multiplied by this value and it's default is 1. You can set it to
	 * 0.5 to slow down time by half or 1.5 to speed up time by half. Negative
	 * values will reverse time but not all engine systems handle this well
	 * at the moment.
	 * @param {Number=} val The time scale value.
	 * @returns {*}
	 */
	timeScale: function (val) {
		if (val !== undefined) {
			this._timeScale = val;
			return this;
		}

		return this._timeScale;
	},

	/**
	 * Increments the engine's interal time by the passed number of milliseconds.
	 * @param {Number} val The number of milliseconds to increment time by.
	 * @param {Number=} lastVal The last internal time value, used to calculate
	 * delta internally in the method.
	 * @returns {Number}
	 */
	incrementTime: function (val, lastVal) {
		if (!this._pause) {
			if (!lastVal) { lastVal = val; }
			this._currentTime += ((val - lastVal) * this._timeScale);
		}
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
	 * Gets / sets the pause flag. If set to true then the engine's
	 * internal time will no longer increment and will instead stay static.
	 * @param val
	 * @returns {*}
	 */
	pause: function (val) {
		if (val !== undefined) {
			this._pause = val;
			return this;
		}
		
		return this._pause;
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
	 * @param {Boolean=} val True to enable manual rendering, false
	 * to disable.
	 * @return {*}
	 */
	useManualRender: function (val) {
		if (val !== undefined) {
			this._useManualRender = val;
			return this;
		}

		return this._useManualRender;
	},

	/**
	 * Manually render a frame on demand. This is used in conjunction
	 * with the ige.useManualRender(true) call which will cause the
	 * engine to only render new graphics frames from the scenegraph
	 * once this method is called. You must call this method every time
	 * you wish to update the graphical output on screen.
	 * 
	 * Calling this method multiple times during a single engine tick
	 * will NOT make it draw more than one frame, therefore it is safe
	 * to call multiple times if required by different sections of game
	 * logic without incurring extra rendering cost.
	 */
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
			first x number of entities then stop, allowing a step through of the renderer in realtime.
		 */
		var st,
			et,
			updateStart,
			renderStart,
			self = ige,
			ptArr = self._postTick,
			ptCount = ptArr.length,
			ptIndex,
			unbornQueue,
			unbornCount,
			unbornIndex,
			unbornEntity;

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
			
			// Check for unborn entities that should be born now
			unbornQueue = ige._spawnQueue;
			unbornCount = unbornQueue.length;
			for (unbornIndex = unbornCount - 1; unbornIndex >= 0; unbornIndex--) {
				unbornEntity = unbornQueue[unbornIndex];
				
				if (ige._currentTime >= unbornEntity._bornTime) {
					// Now birth this entity
					unbornEntity.mount(ige.$(unbornEntity._birthMount));
					unbornQueue.splice(unbornIndex, 1);
				}
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
			self._dpf = self._drawCount;
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
			arrCount, us, ud,
			tickDelta = ige._tickDelta;

		// Process any behaviours assigned to the engine
		this._processUpdateBehaviours(ctx, tickDelta);

		if (arr) {
			arrCount = arr.length;

			// Loop our viewports and call their update methods
			if (igeConfig.debug._timing) {
				while (arrCount--) {
					us = new Date().getTime();
					arr[arrCount].update(ctx, tickDelta);
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
					arr[arrCount].update(ctx, tickDelta);
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
		ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
		//ctx.scale(this._globalScale.x, this._globalScale.y);

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

	dpf: function () {
		return this._dpf;
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
					if (arr[arrCount]._scene) {
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
		var item, items = [], tempItem, tempItem2, tempCam,
			arr, arrCount;

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		item = {
			text: '[' + obj._classId + '] ' + obj.id(),
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
						text: '[' + arr[arrCount]._classId + '] ' + arr[arrCount].id(),
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
					
					if (arr[arrCount].camera) {
						// Add the viewport camera as an object on the scenegraph
						tempCam = {
							text: '[IgeCamera] ' + arr[arrCount].id(),
							id: arr[arrCount].camera.id(),
							classId: arr[arrCount].camera.classId()
						};
						
						if (!noRef) {
							tempCam.parent = arr[arrCount];
							tempCam.obj = arr[arrCount].camera;
						} else {
							tempCam.parentId = arr[arrCount].id();
						}
	
						if (arr[arrCount]._scene) {
							tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
							tempItem.items = [tempCam, tempItem2];
						}
					} else {
						if (arr[arrCount]._scene) {
							tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
							tempItem.items = [tempItem2];
						}
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
	
	_childMounted: function (child) {
		if (child.IgeViewport) {
			// The first mounted viewport gets set as the current
			// one before any rendering is done
			if (!ige._currentViewport) {
				ige._currentViewport = child;
				ige._currentCamera = child.camera;
			}
		}
		
		IgeEntity.prototype._childMounted.call(this, child);
	},

	destroy: function () {
		// Stop the engine and kill any timers
		this.stop();

		// Remove the front buffer (canvas) if we created it
		if (this.isClient) {
			this.removeCanvas();
		}

		// Call class destroy() super method
		IgeEntity.prototype.destroy.call(this);

		this.log('Engine destroy complete.');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEngine; }
