import {version} from "../../package.json";
import igeConfig from "./config";

import IgeRoot from "./IgeRoot";
import IgePoint3d from "./IgePoint3d";
import IgeBaseClass from "./IgeBaseClass";
import IgeDummyContext from "./IgeDummyContext";

import IgeInputComponent from "../components/IgeInputComponent";
import IgeTweenComponent from "../components/IgeTweenComponent";
import IgeTimeComponent from "../components/IgeTimeComponent";
import IgeUiManagerComponent from "../components/IgeUiManagerComponent";
import IgeAudioComponent from "../components/audio/IgeAudioComponent";
import {EventListenerRegister} from "./IgeEventingClass";
import IgeTexture from "./IgeTexture";
import IgeViewport from "./IgeViewport";
import IgeCamera from "./IgeCamera";
import IgeEntity from "./IgeEntity";
import IgeObject from "./IgeObject";
import IgeComponent from "./IgeComponent";
import {SyncEntry} from "../../types/SyncEntry";
import IgeSceneGraph from "./IgeSceneGraph";

class Ige {
	components: Record<string, IgeComponent> = {};
	isServer: boolean;
	isClient: boolean;
	igeClassStore: Record<string, any>;
	root: IgeRoot;
	_canvas: HTMLCanvasElement;
	_ctx: RenderingContext | typeof IgeDummyContext;
	_components: IgeComponent[] = []; // TODO: Rename this to _componentsArr
	_eventListeners: EventListenerRegister = {};
	_textureStore: IgeTexture[];
	_idCounter: number;
	_renderModes: string[];
	_pixelRatioScaling: boolean;
	_requireScriptTotal: number;
	_requireScriptLoading: number;
	_loadingPreText?: string;
	_enableUpdates: boolean;
	_enableRenders: boolean;
	_showSgTree: boolean;
	_renderContext: "2d" | "three";
	_renderMode: number;
	_tickTime: string;
	_updateTime: string;
	_renderTime: string;
	_tickDelta: number;
	_fpsRate: number;
	_state: number;
	_textureImageStore: Record<string, HTMLImageElement | HTMLCanvasElement>;
	_texturesLoading: number;
	_texturesTotal: number;
	_drawCount: number;
	_dps: number;
	_dpf: number;
	_frames: number;
	_fps: number;
	_clientNetDiff: number;
	_frameAlternator: boolean;
	_viewportDepth: boolean;
	_mousePos: IgePoint3d;
	_currentViewport: IgeViewport | null;
	_currentCamera: IgeCamera | null;
	_currentTime: number;
	_globalSmoothing: boolean;
	_register: Record<string, IgeObject | IgeEntity | Ige>;
	_categoryRegister: Record<string, IgeObject> = {};
	_groupRegister: Record<string, IgeObject[]> = {};
	_postTick: (() => void)[];
	_timeSpentInUpdate: Record<string, number>;
	_timeSpentLastUpdate: Record<string, Record<string, number>>;
	_timeSpentInTick: Record<string, number>;
	_timeSpentLastTick: Record<string, Record<string, number>>;
	_timeScale: number;
	_globalScale: IgePoint3d;
	_graphInstances: Record<string, IgeSceneGraph>;
	_spawnQueue: IgeEntity[];
	_headless: boolean;
	_dependencyQueue: (() => boolean)[];
	_secondTimer: number;
	_loggedATL?: boolean;
	_dependencyCheckStart?: number;
	_dependencyCheckTimeout: number;
	_debugEvents: Record<string, boolean | number>;
	_autoSize?: boolean;
	_syncIndex?: number;
	_syncArr?: SyncEntry[];
	_webFonts: FontFace[];
	_cssFonts: string[];
	_mouseOverVp?: IgeViewport;
	_requestAnimFrame?: (callback: (time: number, ctx?: CanvasRenderingContext2D) => void, element?: any) => void;

	constructor (canvas: HTMLCanvasElement) {
		this._eventListeners = {};
		this.isServer = false;
		this.isClient = true;
		this.igeClassStore = {};
		this._textureStore = [];
		this._idCounter = 0;
		this._renderModes = [
			"2d",
			"three"
		];
		this._pixelRatioScaling = true; // Default to scaling the canvas to get non-blurry output
		this._requireScriptTotal = 0;
		this._requireScriptLoading = 0;
		this._loadingPreText = undefined; // The text to put in front of the loading percent on the loading progress screen
		this._enableUpdates = true;
		this._enableRenders = true;
		this._showSgTree = false;
		this._debugEvents = {}; // Holds debug event booleans for named events
		this._renderContext = "2d"; // The rendering context, default is 2d
		this._renderMode = 0; // Integer representation of the render context
		this._tickTime = "NA"; // The time the tick took to process
		this._updateTime = "NA"; // The time the tick update section took to process
		this._renderTime = "NA"; // The time the tick render section took to process
		this._tickDelta = 0; // The time between the last tick and the current one
		this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
		this._state = 0; // Currently stopped
		this._textureImageStore = {};
		this._texturesLoading = 0; // Holds a count of currently loading textures
		this._texturesTotal = 0; // Holds total number of textures loading / loaded
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
			"ige": this
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
		this._graphInstances = {}; // Holds an array of instances of graph classes
		this._spawnQueue = []; // Holds an array of entities that are yet to be born
		this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
		this._dependencyCheckTimeout = 30000; // Wait 30 seconds to load all dependencies then timeout
		this._webFonts = []; // Holds an array of web fonts to load
		this._cssFonts = []; // Holds an array of css fonts we want to wait for (loaded via HTML or CSS rather than our own loadWebFont())

		// Set the context to a dummy context to start
		// with in case we are in "headless" mode and
		// a replacement context never gets assigned
		this._ctx = IgeDummyContext;
		this._headless = true;

		// Deal with some debug settings first
		if (igeConfig.debug) {
			if (!igeConfig.debug._enabled) {
				// Debug is not enabled so ensure that
				// timing debugs are disabled
				igeConfig.debug._timing = false;
			}
		}

		// Output our header
		console.log(`Powered by Isogenic Engine ${version}`);
		console.log("(C)opyright " + new Date().getFullYear() + " Irrelon Software Limited");
		console.log("https://www.isogenicengine.com");
		console.log("------------------------------------------------------------------------------");

		// Set the initial id as the current time in milliseconds. This ensures that under successive
		// restarts of the engine, new ids will still always be created compared to earlier runs -
		// which is important when storing persistent data with ids etc
		this._idCounter = new Date().getTime();

		// Create the base engine instance for the scenegraph
		this.root = new IgeRoot(this).id("root");

		// Setup the canvas
		this.canvas(canvas, true);

		// Setup components
		this.addComponent(IgeInputComponent);
		this.addComponent(IgeTweenComponent);
		this.addComponent(IgeTimeComponent);

		if (this.isClient) {
			// Enable UI element (virtual DOM) support
			this.addComponent(IgeUiManagerComponent);
		}

		// Add the textures loaded dependency
		this._dependencyQueue.push(this.texturesLoaded);
		this._dependencyQueue.push(this.canvasReady);
		this._dependencyQueue.push(this.fontsLoaded);

		// Start a timer to record every second of execution
		this._secondTimer = setInterval(this._secondTick, 1000) as unknown as number;
	}

	loadWebFont (family: string, url: string) {
		this.log(`Font (${family}) loading from url(${url})`);

		const webFont = new FontFace(family, `url(${url})`);
		void webFont.load();

		webFont.loaded.then(() => {
			// Font is loaded
			document.fonts.add(webFont);
			this.log(`Font load (${family}) success`);
		}).catch((err) => {
			// Font loading error
			this.log(`Font load (${family}) error`, err);
		});

		this._webFonts.push(webFont);
	}

	fontsLoaded = () => {
		if (!this._webFonts.length && !this._cssFonts.length) return true;

		const loadedWebFonts = !this._webFonts.length || this._webFonts.every((webFont) => {
			return webFont.status === "loaded" || webFont.status === "error";
		});

		const loadedCssFonts = !this._cssFonts.length || this._cssFonts.every((cssFont) => {
			return this.fontList().includes(cssFont);
		});

		return loadedWebFonts && loadedCssFonts;
	}

	waitForCssFont (fontName: string) {
		this._cssFonts.push(fontName);
	}

	fontList () {
		const { fonts } = document;
		const it = fonts.entries();

		const arr = [];
		let done = false;

		while (!done) {
			const font = it.next();
			if (!font.done) {
				arr.push(font.value[0].family);
			} else {
				done = font.done;
			}
		}

		// converted to set then arr to filter repetitive values
		return [...new Set(arr)];
	}

	/**
	 * Adds an entity to the spawn queue.
	 * @param {IgeEntity} ent The entity to add.
	 * @returns {Ige|[]} Either this, or the spawn queue.
	 */
	spawnQueue (ent) {
		if (ent !== undefined) {
			this._spawnQueue.push(ent);
			return this;
		}

		return this._spawnQueue;
	}

	/**
	 * Creates a new instance of the component argument passing
	 * the options argument to the component as it is initialised.
	 * The new component instance is then added to "this" via
	 * a property name that is defined in the component class as
	 * "componentId".
	 * @param {IgeBaseClass} component The class definition of the component.
	 * @param {Object=} options An options parameter to pass to the component
	 * on init.
	 * @example #Add the velocity component to an entity
	 *     var entity = new IgeEntity();
	 *     entity.addComponent(IgeVelocityComponent);
	 *
	 *     // Now that the component is added, we can access
	 *     // the component via its namespace. Call the
	 *     // "byAngleAndPower" method of the velocity component:
	 *     entity.velocity.byAngleAndPower(IgeBaseClass.degreesToRadians(20), 0.1);
	 */
	addComponent (component: typeof IgeComponent, options?: any) {
		if (component.componentTargetClass) {
			// Check that the entity we are adding this component to is the correct type
			if (this.constructor.name !== component.componentTargetClass) {
				throw new Error(`${component.constructor.name} expected to be added to instance of [${component.componentTargetClass}] but was added to [${this.constructor.name}]`);
			}
		}

		const newComponentInstance = new component(this, this.root, options);

		this.components[newComponentInstance.componentId] = newComponentInstance;

		// Add the component reference to the class component array
		this._components = this._components || [];
		this._components.push(newComponentInstance);

		return this;
	}

	/**
	 * Removes a component by its id.
	 * @param {String} componentId The id of the component to remove.
	 * @example #Remove a component by its id (namespace)
	 *     var entity = new IgeEntity();
	 *
	 *     // Let's add the velocity component
	 *     entity.addComponent(IgeVelocityComponent);
	 *
	 *     // Now that the component is added, let's remove
	 *     // it via it's id ("velocity")
	 *     entity.removeComponent('velocity');
	 */
	removeComponent (componentId: string) {
		// If the component has a destroy method, call it
		const component = this.components[componentId];
		if (component && component.destroy) {
			component.destroy();
		}

		// Remove the component from the class component array
		if (this._components) {
			IgeBaseClass.pull(this._components, component);
		}

		// Remove the component from the class object
		delete this.components[componentId];
		return this;
	}

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned.
	 * @param {String || Object} item The id of the item to return,
	 * or if an object, returns the object as-is.
	 */
	$ (item: string) {
		if (typeof(item) === "string") {
			return this._register[item];
		} else if (typeof(item) === "object") {
			return item;
		}

		return this;
	}

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed category name.
	 * @param {String} categoryName The name of the category to return
	 * all objects for.
	 */
	$$ (categoryName: string) {
		return this._categoryRegister[categoryName] || [];
	}

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed group name.
	 * @param {String} groupName The name of the group to return
	 * all objects for.
	 */
	$$$ (groupName: string) {
		return this._groupRegister[groupName] || [];
	}

	/**
	 * Register an object with the engine object register. The
	 * register allows you to access an object by it's id with
	 * a call to ige.$(objectId).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	register (obj) {
		if (obj !== undefined) {
			if (!this._register[obj.id()]) {
				this._register[obj.id()] = obj;
				obj._registered = true;

				return this;
			} else {
				obj._registered = false;

				this.log("Cannot add object id \"" + obj.id() + "\" to scenegraph because there is already another object in the graph with the same ID!", "error");
				return false;
			}
		}

		return this._register;
	}

	/**
	 * Un-register an object with the engine object register. The
	 * object will no longer be accessible via ige.$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	unRegister (obj) {
		if (obj !== undefined) {
			// Check if the object is registered in the ID lookup
			if (this._register[obj.id()]) {
				delete this._register[obj.id()];
				obj._registered = false;
			}
		}

		return this;
	}

	/**
	 * Register an object with the engine category register. The
	 * register allows you to access an object by it's category with
	 * a call to ige.$$(categoryName).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	categoryRegister (obj) {
		if (obj !== undefined) {
			this._categoryRegister[obj._category] = this._categoryRegister[obj._category] || [];
			this._categoryRegister[obj._category].push(obj);
			obj._categoryRegistered = true;
		}

		return this._register;
	}

	/**
	 * Un-register an object with the engine category register. The
	 * object will no longer be accessible via ige.$$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	categoryUnRegister (obj) {
		if (obj !== undefined) {
			if (this._categoryRegister[obj._category]) {
				IgeBaseClass.pull(this._categoryRegister[obj._category], obj);
				obj._categoryRegistered = false;
			}
		}

		return this;
	}

	/**
	 * Register an object with the engine group register. The
	 * register allows you to access an object by it's groups with
	 * a call to ige.$$$(groupName).
	 * @param {Object} obj The object to register.
	 * @param {String} groupName The name of the group to register
	 * the object in.
	 * @return {*}
	 */
	groupRegister (obj, groupName) {
		if (obj !== undefined) {
			this._groupRegister[groupName] = this._groupRegister[groupName] || [];
			this._groupRegister[groupName].push(obj);
			obj._groupRegistered = true;
		}

		return this._register;
	}

	/**
	 * Un-register an object with the engine group register. The
	 * object will no longer be accessible via ige.$$$().
	 * @param {Object} obj The object to un-register.
	 * @param {String} groupName The name of the group to un-register
	 * the object from.
	 * @return {*}
	 */
	groupUnRegister (obj, groupName) {
		if (obj !== undefined) {
			if (groupName !== undefined) {
				if (this._groupRegister[groupName]) {
					IgeBaseClass.pull(this._groupRegister[groupName], obj);

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
	}

	/**
	 * Sets the canvas element that will be used as the front-buffer.
	 * @param elem The canvas element.
	 * @param autoSize If set to true, the engine will automatically size
	 * the canvas to the width and height of the window upon window resize.
	 */
	canvas (elem: HTMLCanvasElement, autoSize = true) {
		if (elem === undefined) {
			return this._canvas;
		}

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

				this._deviceFinalDrawRatio = Math.ceil(this._devicePixelRatio / this._backingStoreRatio);
			} else {
				// No auto-scaling
				this._devicePixelRatio = 1;
				this._backingStoreRatio = 1;
				this._deviceFinalDrawRatio = 1;
			}

			this.log(`Device pixel ratio is ${this._devicePixelRatio} and canvas pixel ratio set to ${this._deviceFinalDrawRatio}`);

			if (autoSize) {
				this._autoSize = autoSize;
			}

			// Add some event listeners even if autosize is off
			window.addEventListener("resize", this._resizeEvent);

			// Fire the resize event for the first time
			// which sets up initial canvas dimensions
			this._resizeEvent();
			this._ctx = this._canvas.getContext(this._renderContext);
			this._headless = false;
		}
	}

	/**
	 * Clears the entire canvas.
	 */
	clearCanvas () {
		if (this._ctx) {
			// Clear the whole canvas
			this._ctx.clearRect(
				0,
				0,
				this._canvas.width,
				this._canvas.height
			);
		}
	}

	/**
	 * Removes the engine's canvas from the DOM.
	 */
	removeCanvas () {
		// Stop listening for input events
		if (this.input) {
			this.input.destroyListeners();
		}

		// Remove event listener
		window.removeEventListener("resize", this._resizeEvent);

		if (this._createdFrontBuffer) {
			// Remove the canvas from the DOM
			document.body.removeChild(this._canvas);
		}

		// Clear internal references
		delete this._canvas;
		delete this._ctx;
		this._ctx = IgeDummyContext;
		this._headless = true;
	}

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
	traceSet (obj, propName, sampleCount, callbackEvaluator) {
		var self = this;

		obj.___igeTraceCurrentVal = obj.___igeTraceCurrentVal || {};
		obj.___igeTraceCurrentVal[propName] = obj[propName];
		obj.___igeTraceMax = sampleCount || 1;
		obj.___igeTraceCount = 0;

		Object.defineProperty(obj, propName, {
			"get" () {
				return obj.___igeTraceCurrentVal[propName];
			},
			"set" (val) {
				if (callbackEvaluator) {
					if (callbackEvaluator(val)) {
						debugger; // jshint ignore:line
					}
				} else {
					debugger; // jshint ignore:line
				}

				obj.___igeTraceCurrentVal[propName] = val;
				obj.___igeTraceCount++;

				if (obj.___igeTraceCount === obj.___igeTraceMax) {
					// Maximum amount of trace samples reached, turn off
					// the trace system
					self.traceSetOff(obj, propName);
				}
			}
		});
	}

	/**
	 * Turns off a trace that was created by calling traceSet.
	 * @param {Object} object The object whose property you want
	 * to disable a trace against.
	 * @param {String} propName The name of the property you
	 * want to disable the trace for.
	 */
	traceSetOff (object, propName) {
		Object.defineProperty(object, propName, {
			"set" (val) {
				this.___igeTraceCurrentVal[propName] = val;
			}
		});
	}

	createCanvas (options = {"smoothing": false, "pixelRatioScaling": true}) {
		// Creates a new canvas instance with the device pixel ratio
		// and other features setup based on the passed `options` or
		// current ige settings if no options are provided. This is a
		// safe way to generate a new canvas for things like caching
		// stores or whatever
		const canvas = document.createElement("canvas");

		// Get the context
		const ctx = canvas.getContext("2d");

		// Set smoothing mode
		ctx.imageSmoothingEnabled = options.smoothing !== undefined ? options.smoothing : this._globalSmoothing;

		const pixelRatioScaling = options.pixelRatioScaling !== undefined ? options.pixelRatioScaling : this._pixelRatioScaling;

		if (pixelRatioScaling) {
			// Scale the canvas context to account for the device pixel ratio
			ctx.scale(this._deviceFinalDrawRatio, this._deviceFinalDrawRatio);
		}

		// Augment the canvas with width and height setters that handle device ratio
		canvas.igeSetSize = (newWidth, newHeight) => {
			canvas.width = newWidth * this._deviceFinalDrawRatio;
			canvas.height = newHeight * this._deviceFinalDrawRatio;

			// Scale the canvas context to account for the change
			ctx.scale(this._deviceFinalDrawRatio, this._deviceFinalDrawRatio);
		};

		return {
			canvas,
			ctx
		};
	}

	/**
	 * Handles the screen resize event.
	 * @param event
	 * @private
	 */
	_resizeEvent = (event) => {
		var canvasBoundingRect;

		if (this._autoSize) {
			let newWidth = window.innerWidth;
			let newHeight = window.innerHeight;

			// Only update canvas dimensions if it exists
			if (this._canvas) {
				// Check if we can get the position of the canvas
				canvasBoundingRect = this._canvasPosition();

				// Adjust the newWidth and newHeight by the canvas offset
				newWidth -= parseInt(canvasBoundingRect.left);
				newHeight -= parseInt(canvasBoundingRect.top);

				// Make sure we can divide the new width and height by 2...
				// otherwise minus 1 so we get an even number so that we
				// negate the blur effect of sub-pixel rendering
				if (newWidth % 2) { newWidth--; }
				if (newHeight % 2) { newHeight--; }

				this._canvas.width = newWidth * this._deviceFinalDrawRatio;
				this._canvas.height = newHeight * this._deviceFinalDrawRatio;

				if (this._deviceFinalDrawRatio !== 1) {
					this._canvas.style.width = newWidth + "px";
					this._canvas.style.height = newHeight + "px";

					// Scale the canvas context to account for the change
					this._ctx.scale(this._deviceFinalDrawRatio, this._deviceFinalDrawRatio);
				}
			}

			this.root._bounds2d = new IgePoint3d(newWidth, newHeight, 0);

			// Loop any mounted children and check if
			// they should also get resized
			this.root._resizeEvent(event);
		} else {
			if (this._canvas) {
				this.root._bounds2d = new IgePoint3d(this._canvas.width, this._canvas.height, 0);
			}
		}

		if (this._showSgTree) {
			var sgTreeElem = document.getElementById("igeSgTree");

			canvasBoundingRect = this._canvasPosition();

			sgTreeElem.style.top = (parseInt(canvasBoundingRect.top) + 5) + "px";
			sgTreeElem.style.left = (parseInt(canvasBoundingRect.left) + 5) + "px";
			sgTreeElem.style.height = (this.root._bounds2d.y - 30) + "px";
		}

		this._resized = true;
	};

	/**
	 * Gets the bounding rectangle for the HTML canvas element being
	 * used as the front buffer for the engine. Uses DOM methods.
	 * @returns {ClientRect}
	 * @private
	 */
	_canvasPosition () {
		try {
			return this._canvas.getBoundingClientRect();
		} catch (e) {
			return {
				"top": this._canvas.offsetTop,
				"left": this._canvas.offsetLeft
			};
		}
	}

	/**
	 * Toggles full-screen output of the main ige canvas. Only works
	 * if called from within a user-generated HTML event listener.
	 */
	toggleFullScreen = () => {
		var elem = this._canvas;

		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		} else if (elem.mozRequestFullScreen) {
			elem.mozRequestFullScreen();
		} else if (elem.webkitRequestFullscreen) {
			elem.webkitRequestFullscreen();
		}
	};

	/**
	 * Adds a new watch expression to the watch list which will be
	 * displayed in the stats overlay during a call to _statsTick().
	 * @param {*} evalStringOrObject The expression to evaluate and
	 * display the result of in the stats overlay, or an object that
	 * contains a "value" property.
	 * @returns {Integer} The index of the new watch expression you
	 * just added to the watch array.
	 */
	watchStart = (evalStringOrObject) => {
		this._watch = this._watch || [];
		this._watch.push(evalStringOrObject);

		return this._watch.length - 1;
	};

	/**
	 * Removes a watch expression by it's array index.
	 * @param {Number} index The index of the watch expression to
	 * remove from the watch array.
	 */
	watchStop = (index) => {
		this._watch = this._watch || [];
		this._watch.splice(index, 1);
	};

	/**
	 * Finds the first Ige* based class that the passed object
	 * has been derived from.
	 * @param obj
	 * @return {*}
	 */
	findBaseClass = (obj) => {
		if (obj && obj.constructor.name) {
			if (obj.constructor.name.substr(0, 3) === "Ige") {
				return obj.constructor.name;
			} else {
				if (obj.__proto__.constructor.name) {
					return this.findBaseClass(obj.__proto__);
				} else {
					return "";
				}
			}
		} else {
			return "";
		}
	};

	/**
	 * Returns an array of all classes the passed object derives from
	 * in order from current to base.
	 * @param obj
	 * @param arr
	 * @return {*}
	 */
	getClassDerivedList (obj, arr) {
		if (!arr) {
			arr = [];
		} else {
			if (obj.constructor.name) {
				arr.push(obj.constructor.name);
			}
		}

		if (obj.__proto__.constructor.name) {
			this.getClassDerivedList(obj.__proto__, arr);
		}

		return arr;
	}

	/**
	 * Is called every second and does things like calculate the current FPS.
	 * @private
	 */
	_secondTick = () => {
		// Store frames per second
		this._fps = this._frames;

		// Store draws per second
		this._dps = this._dpf * this._fps;

		// Zero out counters
		this._frames = 0;
		this._drawCount = 0;
	};

	/**
	 * Gets / sets the current time scalar value. The engine's internal
	 * time is multiplied by this value and it's default is 1. You can set it to
	 * 0.5 to slow down time by half or 1.5 to speed up time by half. Negative
	 * values will reverse time but not all engine systems handle this well
	 * at the moment.
	 * @param {Number=} val The time scale value.
	 * @returns {*}
	 */
	timeScale (val) {
		if (val !== undefined) {
			this._timeScale = val;
			return this;
		}

		return this._timeScale;
	}

	/**
	 * Increments the engine's internal time by the passed number of milliseconds.
	 * @param {Number} val The number of milliseconds to increment time by.
	 * @param {Number=} lastVal The last internal time value, used to calculate
	 * delta internally in the method.
	 * @returns {Number}
	 */
	incrementTime (val, lastVal) {
		if (!this._pause) {
			if (!lastVal) { lastVal = val; }
			this._currentTime += ((val - lastVal) * this._timeScale);
		}
		return this._currentTime;
	}

	/**
	 * Get the current time from the engine.
	 * @return {Number} The current time.
	 */
	currentTime () {
		return this._currentTime;
	}

	/**
	 * Gets / sets the pause flag. If set to true then the engine's
	 * internal time will no longer increment and will instead stay static.
	 * @param val
	 * @returns {*}
	 */
	pause (val) {
		if (val !== undefined) {
			this._pause = val;
			return this;
		}

		return this._pause;
	}

	/**
	 * Gets / sets the option to determine if the engine should
	 * schedule it's own ticks or if you want to manually advance
	 * the engine by calling tick when you wish to.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	useManualTicks (val) {
		if (val !== undefined) {
			this._useManualTicks = val;
			return this;
		}

		return this._useManualTicks;
	}

	/**
	 * Schedules a manual tick.
	 */
	manualTick () {
		if (this._manualFrameAlternator !== this._frameAlternator) {
			this._manualFrameAlternator = this._frameAlternator;
			this.requestAnimFrame(this.engineStep);
		}
	}

	/**
	 * Gets / sets the option to determine if the engine should
	 * render on every tick or wait for a manualRender() call.
	 * @param {Boolean=} val True to enable manual rendering, false
	 * to disable.
	 * @return {*}
	 */
	useManualRender (val) {
		if (val !== undefined) {
			this._useManualRender = val;
			return this;
		}

		return this._useManualRender;
	}

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
	manualRender () {
		this._manualRender = true;
	}

	fps () {
		return this._fps;
	}

	dpf () {
		return this._dpf;
	}

	dps () {
		return this._dps;
	}

	analyseTiming () {
		if (!igeConfig.debug._timing) {
			this.log("Cannot analyse timing because the igeConfig.debug._timing flag is not enabled so no timing data has been recorded!", "warning");
		}
	}

	saveSceneGraph (item) {
		if (!item) {
			item = this.getSceneGraphData();
		}

		if (item.obj.stringify) {
			item.str = item.obj.stringify();
		} else {
			console.log("Class " + item.constructor.name + " has no stringify() method! For object: " + item.id, item.obj);
		}

		const arr = item.items;

		if (arr) {
			const arrCount = arr.length;

			for (let i = 0; i < arrCount; i++) {
				this.saveSceneGraph(arr[i]);
			}
		}

		return item;
	}

	/**
	 * Walks the scene graph and outputs a console map of the graph.
	 */
	sceneGraph (obj, currentDepth, lastDepth) {
		var depthSpace = "",
			di,
			timingString,
			arr,
			arrCount;

		if (currentDepth === undefined) { currentDepth = 0; }

		if (!obj) {
			// Set the obj to the main ige instance
			obj = this.root;
		}

		for (di = 0; di < currentDepth; di++) {
			depthSpace += "----";
		}

		if (igeConfig.debug._timing) {
			timingString = "";

			timingString += "T: " + this._timeSpentInTick[obj.id()];
			if (this._timeSpentLastTick[obj.id()]) {
				if (typeof(this._timeSpentLastTick[obj.id()].ms) === "number") {
					timingString += " | LastTick: " + this._timeSpentLastTick[obj.id()].ms;
				}

				if (typeof(this._timeSpentLastTick[obj.id()].depthSortChildren) === "number") {
					timingString += " | ChildDepthSort: " + this._timeSpentLastTick[obj.id()].depthSortChildren;
				}
			}

			console.log(depthSpace + obj.id() + " (" + obj.constructor.name + ") : " + obj._inView + " Timing(" + timingString + ")");
		} else {
			console.log(depthSpace + obj.id() + " (" + obj.constructor.name + ") : " + obj._inView);
		}

		currentDepth++;

		if (obj === this.root) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					if (arr[arrCount]._scene) {
						if (arr[arrCount]._scene._shouldRender) {
							if (igeConfig.debug._timing) {
								timingString = "";

								timingString += "T: " + this._timeSpentInTick[arr[arrCount].id()];
								if (this._timeSpentLastTick[arr[arrCount].id()]) {
									if (typeof(this._timeSpentLastTick[arr[arrCount].id()].ms) === "number") {
										timingString += " | LastTick: " + this._timeSpentLastTick[arr[arrCount].id()].ms;
									}

									if (typeof(this._timeSpentLastTick[arr[arrCount].id()].depthSortChildren) === "number") {
										timingString += " | ChildDepthSort: " + this._timeSpentLastTick[arr[arrCount].id()].depthSortChildren;
									}
								}

								console.log(depthSpace + "----" + arr[arrCount].id() + " (" + arr[arrCount].constructor.name + ") : " + arr[arrCount]._inView + " Timing(" + timingString + ")");
							} else {
								console.log(depthSpace + "----" + arr[arrCount].id() + " (" + arr[arrCount].constructor.name + ") : " + arr[arrCount]._inView);
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
	}

	/**
	 * Walks the scenegraph and returns a data object of the graph.
	 */
	getSceneGraphData (obj, noRef) {
		var item, items = [], tempItem, tempItem2, tempCam,
			arr, arrCount;

		if (!obj) {
			// Set the obj to the main ige instance
			obj = this;
		}

		item = {
			"text": "[" + obj.constructor.name + "] " + obj.id(),
			"id": obj.id(),
			"classId": obj.constructor.name
		};

		if (!noRef) {
			item.parent = obj._parent;
			item.obj = obj;
		} else {
			if (obj._parent) {
				item.parentId = obj._parent.id();
			} else {
				item.parentId = "sceneGraph";
			}
		}

		if (obj === this) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = {
						"text": "[" + arr[arrCount].constructor.name + "] " + arr[arrCount].id(),
						"id": arr[arrCount].id(),
						"classId": arr[arrCount].constructor.name
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
							"text": "[IgeCamera] " + arr[arrCount].id(),
							"id": arr[arrCount].camera.id(),
							"classId": arr[arrCount].camera.constructor.name
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
	}

	/**
	 * Adds a scenegraph class into memory.
	 * @param {String|Object} className The name of the scenegraph class, or the class itself.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	addGraph (className, options) {
		if (className !== undefined) {
			var classObj = this.getClass(className),
				classInstance;

			if (classObj) {
				classInstance = this.newClassInstance(className);
				this.log("Loading SceneGraph data class: " + classInstance.constructor.name);

				// Make sure the graph class implements the required methods "addGraph" and "removeGraph"
				if (typeof(classInstance.addGraph) === "function" && typeof(classInstance.removeGraph) === "function") {
					// Call the class's graph() method passing the options in
					classInstance.addGraph(options);

					// Add the graph instance to the holding array
					this._graphInstances[classInstance.constructor.name] = classInstance;
				} else {
					this.log("Could not load graph for class name \"" + className + "\" because the class does not implement both the require methods \"addGraph()\" and \"removeGraph()\".", "error");
				}
			} else {
				this.log("Cannot load graph for class name \"" + className + "\" because the class could not be found. Have you included it in your server/clientConfig.js file?", "error");
			}
		}

		return this;
	}

	/**
	 * Removes a scenegraph class into memory.
	 * @param {String} className The name of the scenegraph class.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	removeGraph (className, options) {
		if (className !== undefined) {
			var classInstance = this._graphInstances[className];

			if (classInstance) {
				this.log("Removing SceneGraph data class: " + className);

				// Call the class's graph() method passing the options in
				classInstance.removeGraph(options);

				// Now remove the graph instance from the graph instance array
				delete this._graphInstances[className];
			} else {
				this.log("Cannot remove graph for class name \"" + className + "\" because the class instance could not be found. Did you add it via ige.addGraph() ?", "error");
			}
		}

		return this;
	}

	/**
	 * Allows the update() methods of the entire scenegraph to
	 * be temporarily enabled or disabled. Useful for debugging.
	 * @param {Boolean=} val If false, will disable all update() calls.
	 * @returns {*}
	 */
	enableUpdates (val) {
		if (val !== undefined) {
			this._enableUpdates = val;
			return this;
		}

		return this._enableUpdates;
	}

	/**
	 * Allows the tick() methods of the entire scenegraph to
	 * be temporarily enabled or disabled. Useful for debugging.
	 * @param {Boolean=} val If false, will disable all tick() calls.
	 * @returns {*}
	 */
	enableRenders (val) {
		if (val !== undefined) {
			this._enableRenders = val;
			return this;
		}

		return this._enableRenders;
	}

	/**
	 * Enables or disables the engine's debug mode. Enabled by default.
	 * @param {Boolean=} val If true, will enable debug mode.
	 * @returns {*}
	 */
	debugEnabled (val) {
		if (val !== undefined) {
			if (igeConfig.debug) {
				igeConfig.debug._enabled = val;
			}
			return this;
		}

		return igeConfig.debug._enabled;
	}

	/**
	 * Enables or disables the engine's debug timing system. The
	 * timing system will time all update and rendering code down
	 * the scenegraph and is useful for tracking long-running code
	 * but comes with a small performance penalty when enabled.
	 * Enabled by default.
	 * @param {Boolean=} val If true, will enable debug timing mode.
	 * @returns {*}
	 */
	debugTiming (val) {
		if (val !== undefined) {
			if (igeConfig.debug) {
				igeConfig.debug._timing = val;
			}
			return this;
		}

		return igeConfig.debug._timing;
	}

	debug (eventName) {
		if (this._debugEvents[eventName] === true || this._debugEvents[eventName] === this._frames) {
			debugger;
		}
	}

	debugEventOn (eventName) {
		this._debugEvents[eventName] = true;
	}

	debugEventOff (eventName) {
		this._debugEvents[eventName] = false;
	}

	triggerDebugEventFrame (eventName) {
		this._debugEvents[eventName] = this._frames;
	}

	/**
	 * Sets the opacity of every object on the scenegraph to
	 * zero *except* the one specified by the given id argument.
	 * @param {String} id The id of the object not to hide.
	 */
	hideAllExcept (id) {
		var i,
			arr = this._register;

		for (i in arr) {
			if (i !== id) {
				arr[i].opacity(0);
			}
		}
	}

	/**
	 * Calls the show() method for every object on the scenegraph.
	 */
	showAll () {
		var i,
			arr = this._register;

		for (i in arr) {
			arr[i].show();
		}
	}

	/**
	 * Sets the frame rate at which new engine steps are fired.
	 * Setting this rate will override the default requestAnimFrame()
	 * method as defined in IgeBaseClass.js and on the client-side, will
	 * stop usage of any available requestAnimationFrame() method
	 * and will use a setTimeout()-based version instead.
	 * @param {Number} fpsRate
	 */
	setFps (fpsRate) {
		if (fpsRate !== undefined) {
			// Override the default requestAnimFrame handler and set
			// our own method up so that we can control the frame rate
			this.requestAnimFrame = (callback) => {
				setTimeout(() => { callback(new Date().getTime()); }, 1000 / fpsRate);
			};
		}
	}

	requestAnimFrame (frameHandlerFunction = () => {}, element) {
		window.requestAnimationFrame(frameHandlerFunction);
	}

	showStats () {
		this.log("showStats has been removed from the ige in favour of the new editor component, please remove this call from your code.");
	}

	/**
	 * Defines a class in the engine's class repository.
	 * @param {String} id The unique class ID or name.
	 * @param {Object} obj The class definition.
	 */
	defineClass (id, obj) {
		this.igeClassStore[id] = obj;
	}

	/**
	 * Retrieves a class by it's ID that was defined with
	 * a call to defineClass().
	 * @param {String} id The ID of the class to retrieve.
	 * @return {Object} The class definition.
	 */
	getClass (id) {
		if (typeof id === "object" || typeof id === "function") {
			return id;
		}
		return this.igeClassStore[id];
	}

	/**
	 * Returns true if the class specified has been defined.
	 * @param {String} id The ID of the class to check for.
	 * @returns {*}
	 */
	classDefined (id) {
		return Boolean(this.igeClassStore[id]);
	}

	/**
	 * Generates a new instance of a class defined with a call
	 * to the defineClass() method. Passes the options
	 * parameter to the new class during it's constructor call.
	 * @param id
	 * @param args
	 * @return {*}
	 */
	newClassInstance (id, ...args) {
		const ClassDefinition = this.getClass(id);
		return new ClassDefinition(this, ...args);
	}

	/**
	 * Checks if all engine start dependencies have been satisfied.
	 * @return {Boolean}
	 */
	dependencyCheck () {
		var arr = this._dependencyQueue,
			arrCount = arr.length;

		while (arrCount--) {
			if (!this._dependencyQueue[arrCount]()) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Gets / sets the flag that determines if viewports should be sorted by depth
	 * like regular entities, before they are processed for rendering each frame.
	 * Depth-sorting viewports increases processing requirements so if you do not
	 * need to stack viewports in a particular order, keep this flag false.
	 * @param {Boolean} val
	 * @return {Boolean}
	 */
	viewportDepth (val) {
		if (val !== undefined) {
			this._viewportDepth = val;
			return this;
		}

		return this._viewportDepth;
	}

	/**
	 * Sets the number of milliseconds before the engine gives up waiting for dependencies
	 * to be satisfied and cancels the startup procedure.
	 * @param val
	 */
	dependencyTimeout (val) {
		this._dependencyCheckTimeout = val;
	}

	/**
	 * Updates the loading screen DOM elements to show the update progress.
	 */
	updateProgress () {
		// Check for a loading progress bar DOM element
		if (typeof(document) !== "undefined" && document.getElementById) {
			var elem = document.getElementById("loadingProgressBar"),
				textElem = document.getElementById("loadingText");

			if (elem) {
				// Calculate the width from progress
				var totalWidth = parseInt(elem.parentNode.offsetWidth),
					currentWidth = Math.floor((totalWidth / this._texturesTotal) * (this._texturesTotal - this._texturesLoading));

				// Set the current bar width
				elem.style.width = currentWidth + "px";

				if (textElem) {
					if (this._loadingPreText === undefined) {
						// Fill the text to use
						this._loadingPreText = textElem.innerHTML;
					}
					textElem.innerHTML = this._loadingPreText + " " + Math.floor((100 / this._texturesTotal) * (this._texturesTotal - this._texturesLoading)) + "%";
				}
			}
		}
	}

	/**
	 * Adds one to the number of textures currently loading.
	 */
	textureLoadStart (url, textureObj) {
		this._texturesLoading++;
		this._texturesTotal++;

		this.updateProgress();

		this.emit("textureLoadStart", textureObj);
	}

	/**
	 * Subtracts one from the number of textures currently loading and if no more need
	 * to load, it will also call the _allTexturesLoaded() method.
	 */
	textureLoadEnd (url, textureObj) {
		if (!textureObj._destroyed) {
			// Add the texture to the _textureStore array
			this._textureStore.push(textureObj);
		}

		// Decrement the overall loading number
		this._texturesLoading--;

		this.updateProgress();

		this.emit("textureLoadEnd", textureObj);

		// If we've finished...
		if (this._texturesLoading === 0) {
			// All textures have finished loading
			this.updateProgress();

			setTimeout(() => {
				this._allTexturesLoaded();
			}, 100);
		}
	}

	/**
	 * Returns a texture from the texture store by it's url.
	 * @param {String} url
	 * @return {IgeTexture}
	 */
	textureFromUrl (url) {
		var arr = this._textureStore,
			arrCount = arr.length,
			item;

		while (arrCount--) {
			item = arr[arrCount];
			if (item._url === url) {
				return item;
			}
		}
	}

	/**
	 * Checks if all textures have finished loading and returns true if so.
	 * @return {Boolean}
	 */
	texturesLoaded = () => {
		return this._texturesLoading === 0;
	}

	/**
	 * Emits the "texturesLoaded" event.
	 * @private
	 */
	_allTexturesLoaded () {
		if (!this._loggedATL) {
			this._loggedATL = true;
			this.log("All textures have loaded");
		}

		// Fire off an event about this
		this.emit("texturesLoaded");
	}

	/**
	 * Checks to ensure that a canvas has been assigned to the engine or that the
	 * engine is in server mode.
	 * @return {Boolean}
	 */
	canvasReady = () => {
		return (this._canvas !== undefined || this.isServer);
	}

	/**
	 * Gets / sets the default smoothing value for all new
	 * IgeTexture class instances. If set to true, all newly
	 * created textures will have smoothing enabled by default.
	 * @param val
	 * @return {*}
	 */
	globalSmoothing (val) {
		if (val !== undefined) {
			this._globalSmoothing = val;
			return this;
		}

		return this._globalSmoothing;
	}

	/**
	 * Generates a new unique ID
	 * @return {String}
	 */
	newId () {
		this._idCounter++;
		return String(this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17)));
	}

	/**
	 * Generates a new 16-character hexadecimal unique ID
	 * @return {String}
	 */
	newIdHex () {
		this._idCounter++;
		return (this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17))).toString(16);
	}

	/**
	 * Generates a new 16-character hexadecimal ID based on
	 * the passed string. Will always generate the same ID
	 * for the same string.
	 * @param {String} str A string to generate the ID from.
	 * @return {String}
	 */
	newIdFromString (str) {
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
			while (this.$(id)) {
				val += Math.pow(10, 17);
				id = (val).toString(16);
			}

			return id;
		}
	}

	/**
	 * Starts the engine.
	 * @param callback
	 */
	start (callback) {
		if (this._state) { return; }

		if (this.dependencyCheck()) {
			// Start the engine
			this.log("Starting engine...");
			this._state = 1;

			// Check if we have a DOM, that there is an igeLoading element
			// and if so, remove it from the DOM now
			if (this.isClient) {
				if (document.getElementsByClassName && document.getElementsByClassName("igeLoading")) {
					var arr = document.getElementsByClassName("igeLoading"),
						arrCount = arr.length;

					while (arrCount--) {
						arr[arrCount].parentNode.removeChild(arr[arrCount]);
					}
				}
			}

			this.requestAnimFrame(this.engineStep);

			this.log("Engine started");

			// Fire the callback method if there was one
			if (typeof (callback) === "function") {
				callback(true);
			}
		} else {
			// Get the current timestamp
			var curTime = new Date().getTime();

			// Record when we first started checking for dependencies
			if (!this._dependencyCheckStart) {
				this._dependencyCheckStart = curTime;
			}

			// Check if we have timed out
			if (curTime - this._dependencyCheckStart > this._dependencyCheckTimeout) {
				this.log("Engine start failed because the dependency check timed out after " + (this._dependencyCheckTimeout / 1000) + " seconds", "error");
				if (typeof (callback) === "function") {
					callback(false);
				}
			} else {
				// Start a timer to keep checking dependencies
				setTimeout(() => { this.start(callback); }, 200);
			}
		}
	}

	/**
	 * Stops the engine.
	 * @return {Boolean}
	 */
	stop () {
		// If we are running, stop the engine
		if (this._state) {
			this.log("Stopping engine...");
			this._state = 0;

			return true;
		} else {
			return false;
		}
	}

	/**
	 * Called each frame to traverse and render the scenegraph.
	 */
	engineStep = (timeStamp, ctx) => {
		/* TODO:
			Make the scenegraph process simplified. Walk the scenegraph once and grab the order in a flat array
			then process updates and ticks. This will also allow a layered rendering system that can render the
			first x number of entities then stop, allowing a step through of the renderer in realtime.
		 */
		var st,
			et,
			updateStart,
			renderStart,
			ptArr = this._postTick,
			ptCount = ptArr.length,
			ptIndex,
			unbornQueue,
			unbornCount,
			unbornIndex,
			unbornEntity;

		// Scale the timestamp according to the current
		// engine's time scaling factor
		this.incrementTime(timeStamp, this._timeScaleLastTimestamp);

		this._timeScaleLastTimestamp = timeStamp;
		timeStamp = Math.floor(this._currentTime);

		if (igeConfig.debug._timing) {
			st = new Date().getTime();
		}

		if (this._state) {
			// Check if we were passed a context to work with
			if (ctx === undefined) {
				ctx = this._ctx;
			}

			// Alternate the boolean frame alternator flag
			this._frameAlternator = !this._frameAlternator;

			// If the engine is not in manual tick mode...
			if (!this._useManualTicks) {
				// Schedule a new frame
				this.requestAnimFrame(this.engineStep);
			} else {
				this._manualFrameAlternator = !this._frameAlternator;
			}

			// Get the current time in milliseconds
			this._tickStart = timeStamp;

			// Adjust the tickStart value by the difference between
			// the server and the client clocks (this is only applied
			// when running as the client - the server always has a
			// clientNetDiff of zero)
			this._tickStart -= this._clientNetDiff;

			if (!this.lastTick) {
				// This is the first time we've run so set some
				// default values and set the delta to zero
				this.lastTick = 0;
				this._tickDelta = 0;
			} else {
				// Calculate the frame delta
				this._tickDelta = this._tickStart - this.lastTick;
			}

			// Check for unborn entities that should be born now
			unbornQueue = this._spawnQueue;
			unbornCount = unbornQueue.length;
			for (unbornIndex = unbornCount - 1; unbornIndex >= 0; unbornIndex--) {
				unbornEntity = unbornQueue[unbornIndex];

				if (this._currentTime >= unbornEntity._bornTime) {
					// Now birth this entity
					unbornEntity.mount(this.$(unbornEntity._birthMount));
					unbornQueue.splice(unbornIndex, 1);
				}
			}

			// Update the scenegraph
			if (this._enableUpdates) {
				if (igeConfig.debug._timing) {
					updateStart = new Date().getTime();
					this.root.updateSceneGraph(ctx);
					this._updateTime = new Date().getTime() - updateStart;
				} else {
					this.root.updateSceneGraph(ctx);
				}
			}

			// Render the scenegraph
			if (this._enableRenders) {
				if (!this._useManualRender) {
					if (igeConfig.debug._timing) {
						renderStart = new Date().getTime();
						this.root.renderSceneGraph(ctx);
						this._renderTime = new Date().getTime() - renderStart;
					} else {
						this.root.renderSceneGraph(ctx);
					}
				} else {
					if (this._manualRender) {
						if (igeConfig.debug._timing) {
							renderStart = new Date().getTime();
							this.root.renderSceneGraph(ctx);
							this._renderTime = new Date().getTime() - renderStart;
						} else {
							this.root.renderSceneGraph(ctx);
						}
						this._manualRender = false;
					}
				}
			}

			// Call post-tick methods
			for (ptIndex = 0; ptIndex < ptCount; ptIndex++) {
				ptArr[ptIndex]();
			}

			// Record the lastTick value so we can
			// calculate delta on the next tick
			this.lastTick = this._tickStart;
			this._frames++;
			this._dpf = this._drawCount;
			this._drawCount = 0;

			// Call the input system tick to reset any flags etc
			if (this.input) {
				this.input.tick();
			}
		}

		this._resized = false;

		if (igeConfig.debug._timing) {
			et = new Date().getTime();
			this._tickTime = et - st;
		}
	};

	/**
	 * Gets / sets the _autoSize property. If set to true, the engine will listen
	 * for any change in screen size and resize the front-buffer (canvas) element
	 * to match the new screen size.
	 * @param val
	 * @return {Boolean}
	 */
	autoSize (val) {
		if (val !== undefined) {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	}

	pixelRatioScaling (val) {
		if (val !== undefined) {
			this._pixelRatioScaling = val;
			return this;
		}

		return this._pixelRatioScaling;
	}

	/**
	 * Gets / sets the rendering context that will be used when getting the
	 * context from canvas elements.
	 * @param {String=} contextId The context such as '2d'. Defaults to '2d'.
	 * @return {*}
	 */
	renderContext (contextId) {
		if (contextId !== undefined) {
			this._renderContext = contextId;
			this._renderMode = this._renderModes[contextId];

			this.log("Rendering mode set to: " + contextId);

			return this;
		}

		return this._renderContext;
	}

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
	createFrontBuffer (autoSize, dontScale) {
		if (!this.isClient) { return; }
		if (this._canvas) { return; }

		this._createdFrontBuffer = true;
		this._pixelRatioScaling = !dontScale;
		this._frontBufferSetup(autoSize, dontScale);
	}

	_frontBufferSetup (autoSize, dontScale) {
		// Create a new canvas element to use as the
		// rendering front-buffer
		var tempCanvas = document.createElement("canvas");

		// Set the canvas element id
		tempCanvas.id = "igeFrontBuffer";

		this.canvas(tempCanvas, autoSize);
		document.body.appendChild(tempCanvas);
	}

	/**
	 * Provides logging capabilities to all IgeBaseClass instances.
	 * @param {String} text The text to log.
	 * @param {String} type The type of log to output, can be 'log',
	 * 'info', 'warning' or 'error'.
	 * @param {Object=} obj An optional object that will be output
	 * before the log text is output.
	 * @example #Log a message
	 *     var entity = new IgeEntity();
	 *
	 *     // Will output:
	 *     //     IGE *log* [IgeEntity] : hello
	 *     entity.log('Hello');
	 * @example #Log an info message with an optional parameter
	 *     var entity = new IgeEntity(),
	 *         param = 'moo';
	 *
	 *     // Will output:
	 *     //    moo
	 *     //    IGE *log* [IgeEntity] : hello
	 *     entity.log('Hello', 'info', param);
	 * @example #Log a warning message (which will cause a stack trace to be shown)
	 *     var entity = new IgeEntity();
	 *
	 *     // Will output (stack trace is just an example here, real one will be more useful):
	 *     //    Stack: {anonymous}()@<anonymous>:2:8
	 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
	 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
	 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
	 *     //    IGE *warning* [IgeEntity] : A test warning
	 *     entity.log('A test warning', 'warning');
	 * @example #Log an error message (which will cause an exception to be raised and a stack trace to be shown)
	 *     var entity = new IgeEntity();
	 *
	 *     // Will output (stack trace is just an example here, real one will be more useful):
	 *     //    Stack: {anonymous}()@<anonymous>:2:8
	 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
	 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
	 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
	 *     //    IGE *error* [IgeEntity] : An error message
	 *     entity.log('An error message', 'error');
	 */
	log (...args) {
		console.log(...args);
		if (igeConfig.debug._enabled) {

		}

		return this;
	}

	// ==================================================================================================
	// ==================================================================================================
	// ==================================================================================================
	// ==================================================================================================

	/**
	 * Add an event listener method for an event.
	 * @param {String || Array} eventName The name of the event to listen for (string), or an array of events to listen for.
	 * @param {Function} call The method to call when the event listener is triggered.
	 * @param {Object=} context The context in which the call to the listening method will be made (sets the 'this' variable in the method to the object passed as this parameter).
	 * @param {Boolean=} oneShot If set, will instruct the listener to only listen to the event being fired once and will not fire again.
	 * @param {Boolean=} sendEventName If set, will instruct the emitter to send the event name as the argument instead of any emitted arguments.
	 * @return {Object} The event listener object. Hold this value if you later want to turn off the event listener.
	 * @example #Add an Event Listener
	 *     // Register event lister and store in "evt"
	 *     var evt = myEntity.on('mouseDown', function () { console.log('down'); });
	 * @example #Listen for Event Data
	 *     // Set a listener to listen for the data (multiple values emitted
	 *     // from an event are passed as function arguments)
	 *     myEntity.on('hello', function (arg1, arg2) {
	 *         console.log(arg1, arg2);
	 *     }
	 *
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', ['data1', 'data2']);
	 *
	 *     // The console output is:
	 *     //    data1, data2
	 */
	on (eventName, call, context, oneShot, sendEventName) {
		let self = this,
			newListener,
			addListener,
			existingIndex,
			elArr,
			multiEvent,
			eventIndex,
			eventData,
			eventObj,
			multiEventName;

		// Check that we have an event listener object
		this._eventListeners = this._eventListeners || {};

		if (typeof call === "function") {
			if (typeof eventName === "string") {
				// Compose the new listener
				newListener = {
					call,
					context,
					oneShot,
					sendEventName
				};

				elArr = this._eventListeners[eventName] = this._eventListeners[eventName] || [];

				// Check if we already have this listener in the list
				addListener = true;

				// TO-DO - Could this do with using indexOf? Would that work? Would be faster?
				existingIndex = elArr.indexOf(newListener);
				if (existingIndex > -1) {
					addListener = false;
				}

				// Add this new listener
				if (addListener) {
					elArr.push(newListener);
				}

				return newListener;
			} else {
				// The eventName is an array of names, creating a group of events
				// that must be fired to fire this event callback
				if (eventName.length) {
					// Loop the event array
					multiEvent = [];
					multiEvent[0] = 0; // This will hold our event count total
					multiEvent[1] = 0; // This will hold our number of events fired

					// Define the multi event callback
					multiEvent[3] = function (firedEventName) {
						multiEvent[1]++;

						if (multiEvent[0] === multiEvent[1]) {
							// All the multi-event events have fired
							// so fire the callback
							call.apply(context || self);
						}
					};

					for (eventIndex in eventName) {
						if (Object.prototype.hasOwnProperty.call(eventName, eventIndex)) {
							eventData = eventName[eventIndex];
							eventObj = eventData[0];
							multiEventName = eventData[1];

							// Increment the event listening count total
							multiEvent[0]++;

							// Register each event against the event object with a callback
							eventObj.on(multiEventName, multiEvent[3], null, true, true);
						}
					}
				}
			}
		} else {
			if (typeof(eventName) !== "string") {
				eventName = "*Multi-Event*";
			}
			this.log("Cannot register event listener for event \"" + eventName + "\" because the passed callback is not a function!", "error");
		}
	}

	/**
	 * Remove an event listener. If the _processing flag is true
	 * then the removal will be placed in the removals array to be
	 * processed after the event loop has completed in the emit()
	 * method.
	 * @param {Boolean} eventName The name of the event you originally registered to listen for.
	 * @param {Object} evtListener The event listener object to cancel. This object is the one
	 * returned when calling the on() method. It is NOT the method you passed as the second argument
	 * to the on() method.
	 * @param {Function} callback The callback method to call when the event listener has been
	 * successfully removed. If you attempt to remove a listener during the event firing loop
	 * then the listener will not immediately be removed but will be queued for removal before
	 * the next listener loop is fired. In this case you may like to be informed via callback
	 * when the listener has been fully removed in which case, provide a method for this argument.
	 *
	 * The callback will be passed a single boolean argument denoting if the removal was successful
	 * (true) or the listener did not exist to remove (false).
	 * @example #Switch off an Event Listener
	 *     // Register event lister and store in "evt"
	 *     var evt = myEntity.on('mouseDown', function () { console.log('down'); });
	 *
	 *     // Switch off event listener
	 *     myEntity.off('mouseDown', evt);
	 * @return {Boolean}
	 */
	off (eventName, evtListener, callback) {
		if (this._eventListeners) {
			if (!this._eventListeners._processing) {
				if (this._eventListeners[eventName]) {
					// Find this listener in the list
					var evtListIndex = this._eventListeners[eventName].indexOf(evtListener);
					if (evtListIndex > -1) {
						// Remove the listener from the event listener list
						this._eventListeners[eventName].splice(evtListIndex, 1);
						if (callback) {
							callback(true);
						}
						return true;
					} else {
						this.log("Failed to cancel event listener for event named \"" + eventName + "\" !", "warning", evtListener);
					}
				} else {
					this.log("Failed to cancel event listener!");
				}
			} else {
				// Add the removal to a remove queue since we are processing
				// listeners at the moment and removing one would mess up the
				// loop!
				this._eventListeners._removeQueue = this._eventListeners._removeQueue || [];
				this._eventListeners._removeQueue.push([eventName, evtListener, callback]);

				return -1;
			}
		}

		if (callback) {
			callback(false);
		}
		return false;
	}

	/**
	 * Emit an event by name.
	 * @param {Object} eventName The name of the event to emit.
	 * @param {Object || Array} [args] The arguments to send to any listening methods.
	 * If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 * @example #Emit an Event
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello');
	 * @example #Emit an Event With Data Object
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', {moo: true});
	 * @example #Emit an Event With Multiple Data Values
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', [{moo: true}, 'someString']);
	 * @example #Listen for Event Data
	 *     // Set a listener to listen for the data (multiple values emitted
	 *     // from an event are passed as function arguments)
	 *     myEntity.on('hello', function (arg1, arg2) {
	 *         console.log(arg1, arg2);
	 *     }
	 *
	 *     // Emit the event named "hello"
	 *     myEntity.emit('hello', ['data1', 'data2']);
	 *
	 *     // The console output is:
	 *     //    data1, data2
	 */
	emit (eventName, args) {
		if (!this._eventListeners) {
			return -1;
		}

		// Check if the event has any listeners
		if (!this._eventListeners[eventName]) {
			return -1;
		}

		// Fire the listeners for this event
		let eventCount = this._eventListeners[eventName].length,
			eventCount2 = this._eventListeners[eventName].length - 1,
			finalArgs, i, cancelFlag, eventIndex, tempEvt, retVal;

		// If there are some events, ensure that the args is ready to be used
		if (!eventCount) {
			return -1;
		}

		finalArgs = [];

		if (typeof(args) === "object" && args !== null && args[0] !== null && args[0] !== undefined) {
			for (i in args) {
				if (Object.prototype.hasOwnProperty.call(args, i)) {
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
			eventIndex = eventCount2 - eventCount;
			tempEvt = this._eventListeners[eventName][eventIndex];

			// If the sendEventName flag is set, overwrite the arguments with the event name
			if (tempEvt.sendEventName) { finalArgs = [eventName]; }

			// Call the callback
			retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

			// If the retVal === true then store the cancel flag and return to the emitting method
			if (retVal === true) {
				// The receiver method asked us to send a cancel request back to the emitter
				cancelFlag = true;
			}

			// Check if we should now cancel the event
			if (tempEvt.oneShot) {
				// The event has a oneShot flag so since we have fired the event,
				// lets cancel the listener now
				if (this.off(eventName, tempEvt) === true) {
					eventCount2--;
				}
			}
		}

		// Check that the array still exists because an event
		// could have triggered a method that destroyed our object
		// which would have deleted the array!
		if (this._eventListeners) {
			this._eventListeners._processing = false;

			// Now process any event removal
			this._processRemovals();
		}

		if (cancelFlag) {
			return 1;
		}
	}

	/**
	 * Returns an object containing the current event listeners.
	 * @return {Object}
	 */
	eventList () {
		return this._eventListeners;
	}

	/**
	 * Loops the removals array and processes off() calls for
	 * each array item.
	 * @private
	 */
	_processRemovals () {
		if (!this._eventListeners) {
			return;
		}

		let remArr = this._eventListeners._removeQueue,
			arrCount,
			item,
			result;

		// If the removal array exists
		if (remArr) {
			// Get the number of items in the removal array
			arrCount = remArr.length;

			// Loop the array
			while (arrCount--) {
				item = remArr[arrCount];

				// Call the off() method for this item
				result = this.off(item[0], item[1]);

				// Check if there is a callback
				if (typeof remArr[2] === "function") {
					// Call the callback with the removal result
					remArr[2](result);
				}
			}
		}

		// Remove the removal array
		delete this._eventListeners._removeQueue;
	}

	destroy () {
		// Stop the engine and kill any timers
		this.stop();
		this.root.destroy();

		// Remove the front buffer (canvas) if we created it
		if (this.isClient) {
			this.removeCanvas();
		}

		this.log("Engine destroy complete.");
	}
}

export default Ige;
