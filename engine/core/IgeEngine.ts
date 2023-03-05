import IgeRoot from "./IgeRoot";
import IgePoint3d from "./IgePoint3d";
import IgeDummyContext from "./IgeDummyContext";
import IgePoint2d from "./IgePoint2d";
import IgeInputComponent from "../components/IgeInputComponent";
import IgeTweenComponent from "../components/IgeTweenComponent";
import IgeTimeComponent from "../components/IgeTimeComponent";
import { arrPull } from "../services/utils";

import type { SyncEntry, SyncMethod } from "../../types/SyncEntry";
import type IgeBaseClass from "./IgeBaseClass";
import type IgeTexture from "./IgeTexture";
import type IgeViewport from "./IgeViewport";
import type IgeCamera from "./IgeCamera";
import type IgeSceneGraph from "./IgeSceneGraph";
import type IgeImage from "./IgeImage";
import IgeEntity from "./IgeEntity";
import { IgeRegisterable } from "../../types/IgeRegisterable";
import { ige } from "../instance";

export class IgeEngine extends IgeEntity {
	isServer: boolean;
	isClient: boolean;
	client?: IgeBaseClass;
	server?: IgeBaseClass;
	igeClassStore: Record<string, any>;
	root?: IgeRoot; // The root entity that all scenegraph will mount to
	_registered: boolean = true;
	_canvas?: HTMLCanvasElement;
	_ctx: CanvasRenderingContext2D | null | typeof IgeDummyContext;
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
	_tickTime: number;
	_updateTime: number;
	_renderTime: number;
	_tickDelta: number;
	_fpsRate: number;
	_manualRender: boolean = false;
	_state: number;
	_textureImageStore: Record<string, IgeImage>;
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
	_register: Record<string, IgeRegisterable>;
	_categoryRegister: Record<string, IgeEntity> = {};
	_groupRegister: Record<string, IgeEntity[]> = {};
	_postTick: (() => void)[];
	_timeSpentInUpdate: Record<string, number>;
	_timeSpentLastUpdate: Record<string, Record<string, number>>;
	_timeSpentInTick: Record<string, number>;
	_timeSpentLastTick: Record<string, Record<string, number>>;
	_timeScale: number;
	_tickStart: number = 0;
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
	_syncIndex: number = 0;
	_syncArr: SyncEntry[] = [];
	_webFonts: FontFace[];
	_cssFonts: string[];
	_mouseOverVp?: IgeViewport;
	_deviceFinalDrawRatio: number = 1;
	_createdFrontBuffer: boolean = false;
	_devicePixelRatio: number = 1;
	_backingStoreRatio: number = 1;
	_resized: boolean = false;
	_timeScaleLastTimestamp: number = 0;
	_useManualTicks: boolean = false;
	_manualFrameAlternator: boolean = false;
	lastTick: number = 0;
	_requestAnimFrame?: (callback: (time: number, ctx?: CanvasRenderingContext2D) => void, element?: Element) => void;

	constructor () {
		super();
		this.isServer = false;
		this.isClient = true;
		this.igeClassStore = {};
		this._idCounter = 0;
		this._renderModes = ["2d", "three"];
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
		this._tickTime = NaN; // The time the tick took to process
		this._updateTime = NaN; // The time the tick update section took to process
		this._renderTime = NaN; // The time the tick render section took to process
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
			ige: this
		}; // Holds a reference to every item in the scenegraph by its ID
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
		if (ige.config.debug) {
			if (!ige.config.debug._enabled) {
				// Debug is not enabled so ensure that
				// timing debugs are disabled
				ige.config.debug._timing = false;
			}
		}

		// Output our header
		console.log("-----------------------------------------");
		console.log(`Powered by Isogenic Engine ${ige.version}`);
		console.log("(C)opyright " + new Date().getFullYear() + " Irrelon Software Limited");
		console.log("https://www.isogenicengine.com");
		console.log("-----------------------------------------");

		// Set the initial id as the current time in milliseconds. This ensures that under successive
		// restarts of the engine, new ids will still always be created compared to earlier runs -
		// which is important when storing persistent data with ids etc
		this._idCounter = new Date().getTime();

		// Add the textures loaded dependency
		this._dependencyQueue.push(ige.textures.haveAllTexturesLoaded);
		this._dependencyQueue.push(this.canvasReady);
		this._dependencyQueue.push(this.fontsLoaded);

		// Start a timer to record every second of execution
		this._secondTimer = setInterval(this._secondTick, 1000) as unknown as number;
	}

	id (): string;
	id (id: string): this;
	id (id?: string): this | string | undefined {
		if (!id) {
			return "ige";
		}

		return this;
	}

	createRoot () {
		if (this.root) return;

		// Create the base engine instance for the scenegraph
		this.root = new IgeRoot();

		// Set the entity on which any components are added - this defaults to "this"
		// in the IgeComponentMixin.ts file - we override that here in this special case
		this._componentBase = this.root;

		this._resizeEvent();

		// Set up components
		this.addComponent(IgeInputComponent);
		this.addComponent(IgeTweenComponent);
		this.addComponent(IgeTimeComponent);
		//
		// if (this.isClient) {
		//     // Enable UI element (virtual DOM) support
		//     this.addComponent(IgeUiManagerComponent);
		// }
	}

	loadWebFont (family: string, url: string) {
		this.log(`Font (${family}) loading from url(${url})`);

		const webFont = new FontFace(family, `url(${url})`);
		void webFont.load();

		webFont.loaded
			.then(() => {
				// Font is loaded
				document.fonts.add(webFont);
				this.log(`Font load (${family}) success`);
			})
			.catch((err) => {
				// Font loading error
				this.log(`Font load (${family}) error`, err);
			});

		this._webFonts.push(webFont);
	}

	fontsLoaded = () => {
		if (!this._webFonts.length && !this._cssFonts.length) return true;

		const loadedWebFonts =
            !this._webFonts.length ||
            this._webFonts.every((webFont) => {
            	return webFont.status === "loaded" || webFont.status === "error";
            });

		const loadedCssFonts =
            !this._cssFonts.length ||
            this._cssFonts.every((cssFont) => {
            	return this.fontList().includes(cssFont);
            });

		return loadedWebFonts && loadedCssFonts;
	};

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
     * @param {IgeEntity} entity The entity to add.
     * @returns {Ige|[]} Either this, or the spawn queue.
     */
	spawnQueue (entity: IgeEntity) {
		if (entity !== undefined) {
			this._spawnQueue.push(entity);
			return this;
		}

		return this._spawnQueue;
	}

	/**
     * Returns an object from the engine's object register by
     * the object's id. If the item passed is not a string id
     * then the item is returned as is. If no item is passed
     * the engine itself is returned.
     * @param {String || Object} item The id of the item to return,
     * or if an object, returns the object as-is.
     */
	$ (item: string | IgeEntity) {
		if (typeof item === "string") {
			return this._register[item];
		} else if (typeof item === "object") {
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
     * register allows you to access an object by its id with
     * a call to ige.$(objectId).
     * @param {Object} obj The object to register.
     * @return {*}
     */
	register (obj: IgeRegisterable) {
		if (obj !== undefined) {
			if (!this._register[obj.id()]) {
				this._register[obj.id()] = obj;
				obj._registered = true;

				return this;
			} else {
				obj._registered = false;

				this.log(
					"Cannot add object id \"" +
                    obj.id() +
                    "\" to scenegraph because there is already another object in the graph with the same ID!",
					"error"
				);
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
				arrPull(this._categoryRegister[obj._category], obj);
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
					arrPull(this._groupRegister[groupName], obj);

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
	canvas (elem?: HTMLCanvasElement, autoSize = true) {
		if (elem === undefined) {
			// Return current value
			return this._canvas;
		}

		if (this._canvas) {
			// We already have a canvas
			return;
		}

		this._canvas = elem;
		this._ctx = this._canvas.getContext(this._renderContext);

		if (this._pixelRatioScaling) {
			// Support high-definition devices and "retina" (stupid marketing name)
			// displays by adjusting for device and back store pixels ratios
			this._devicePixelRatio = window.devicePixelRatio || 1;
			this._backingStoreRatio =
                this._ctx.webkitBackingStorePixelRatio ||
                this._ctx.mozBackingStorePixelRatio ||
                this._ctx.msBackingStorePixelRatio ||
                this._ctx.oBackingStorePixelRatio ||
                this._ctx.backingStorePixelRatio ||
                1;

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

		window.addEventListener("resize", this._resizeEvent);
		this._resizeEvent();
		this._ctx = this._canvas.getContext(this._renderContext);
		this._headless = false;
	}

	/**
     * Clears the entire canvas.
     */
	clearCanvas () {
		if (this._ctx) {
			// Clear the whole canvas
			this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
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
		const self = this;

		obj.___igeTraceCurrentVal = obj.___igeTraceCurrentVal || {};
		obj.___igeTraceCurrentVal[propName] = obj[propName];
		obj.___igeTraceMax = sampleCount || 1;
		obj.___igeTraceCount = 0;

		Object.defineProperty(obj, propName, {
			get () {
				return obj.___igeTraceCurrentVal[propName];
			},
			set (val) {
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
			set (val) {
				this.___igeTraceCurrentVal[propName] = val;
			}
		});
	}

	createCanvas (options = { smoothing: false, pixelRatioScaling: true }) {
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
	_resizeEvent = (event?: Event) => {
		let canvasBoundingRect;

		if (this._autoSize) {
			let newWidth = window.innerWidth;
			let newHeight = window.innerHeight;

			// Only update canvas dimensions if it exists
			if (this._canvas) {
				// Check if we can get the position of the canvas
				canvasBoundingRect = this._canvasPosition();

				// Adjust the newWidth and newHeight by the canvas offset
				newWidth -= canvasBoundingRect.left;
				newHeight -= canvasBoundingRect.top;

				// Make sure we can divide the new width and height by 2...
				// otherwise minus 1 so we get an even number so that we
				// negate the blur effect of sub-pixel rendering
				if (newWidth % 2) {
					newWidth--;
				}
				if (newHeight % 2) {
					newHeight--;
				}

				this._canvas.width = newWidth * this._deviceFinalDrawRatio;
				this._canvas.height = newHeight * this._deviceFinalDrawRatio;

				if (this._deviceFinalDrawRatio !== 1) {
					this._canvas.style.width = newWidth + "px";
					this._canvas.style.height = newHeight + "px";

					if (this._ctx) {
						// Scale the canvas context to account for the change
						this._ctx.scale(this._deviceFinalDrawRatio, this._deviceFinalDrawRatio);
					}
				}
			}

			if (this.root) {
				this.root._bounds2d = new IgePoint2d(newWidth, newHeight);

				// Loop any mounted children and check if
				// they should also get resized
				this.root._resizeEvent(event);
			}
		} else {
			if (this._canvas && this.root) {
				this.root._bounds2d = new IgePoint2d(this._canvas.width, this._canvas.height);
			}
		}

		if (this._showSgTree) {
			const sgTreeElem = document.getElementById("igeSgTree");

			if (sgTreeElem) {
				canvasBoundingRect = this._canvasPosition();

				sgTreeElem.style.top = parseInt(canvasBoundingRect.top) + 5 + "px";
				sgTreeElem.style.left = parseInt(canvasBoundingRect.left) + 5 + "px";
				sgTreeElem.style.height = this.root._bounds2d.y - 30 + "px";
			}
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
		if (!this._canvas) {
			return {
				top: 0,
				left: 0
			};
		}

		try {
			return this._canvas.getBoundingClientRect();
		} catch (e) {
			return {
				top: this._canvas.offsetTop,
				left: this._canvas.offsetLeft
			};
		}
	}

	/**
     * Toggles full-screen output of the main ige canvas. Only works
     * if called from within a user-generated HTML event listener.
     */
	toggleFullScreen = () => {
		const elem = this._canvas;

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
			if (!lastVal) {
				lastVal = val;
			}
			this._currentTime += (val - lastVal) * this._timeScale;
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
		if (!ige.config.debug._timing) {
			this.log(
				"Cannot analyse timing because the ige.config.debug._timing flag is not enabled so no timing data has been recorded!",
				"warning"
			);
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
		let depthSpace = "",
			di,
			timingString,
			arr,
			arrCount;

		if (currentDepth === undefined) {
			currentDepth = 0;
		}

		if (!obj) {
			// Set the obj to the main ige instance
			obj = this.root;
		}

		for (di = 0; di < currentDepth; di++) {
			depthSpace += "----";
		}

		if (ige.config.debug._timing) {
			timingString = "";

			timingString += "T: " + this._timeSpentInTick[obj.id()];
			if (this._timeSpentLastTick[obj.id()]) {
				if (typeof this._timeSpentLastTick[obj.id()].ms === "number") {
					timingString += " | LastTick: " + this._timeSpentLastTick[obj.id()].ms;
				}

				if (typeof this._timeSpentLastTick[obj.id()].depthSortChildren === "number") {
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
							if (ige.config.debug._timing) {
								timingString = "";

								timingString += "T: " + this._timeSpentInTick[arr[arrCount].id()];
								if (this._timeSpentLastTick[arr[arrCount].id()]) {
									if (typeof this._timeSpentLastTick[arr[arrCount].id()].ms === "number") {
										timingString += " | LastTick: " + this._timeSpentLastTick[arr[arrCount].id()].ms;
									}

									if (typeof this._timeSpentLastTick[arr[arrCount].id()].depthSortChildren === "number") {
										timingString +=
                                            " | ChildDepthSort: " + this._timeSpentLastTick[arr[arrCount].id()].depthSortChildren;
									}
								}

								console.log(
									depthSpace +
                                    "----" +
                                    arr[arrCount].id() +
                                    " (" +
                                    arr[arrCount].constructor.name +
                                    ") : " +
                                    arr[arrCount]._inView +
                                    " Timing(" +
                                    timingString +
                                    ")"
								);
							} else {
								console.log(
									depthSpace +
                                    "----" +
                                    arr[arrCount].id() +
                                    " (" +
                                    arr[arrCount].constructor.name +
                                    ") : " +
                                    arr[arrCount]._inView
								);
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
		let item,
			items = [],
			tempItem,
			tempItem2,
			tempCam,
			arr,
			arrCount;

		if (!obj) {
			// Set the obj to the main ige instance
			obj = this;
		}

		item = {
			text: "[" + obj.constructor.name + "] " + obj.id(),
			id: obj.id(),
			classId: obj.constructor.name
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
						text: "[" + arr[arrCount].constructor.name + "] " + arr[arrCount].id(),
						id: arr[arrCount].id(),
						classId: arr[arrCount].constructor.name
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
							text: "[IgeCamera] " + arr[arrCount].id(),
							id: arr[arrCount].camera.id(),
							classId: arr[arrCount].camera.constructor.name
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
	addGraph (className: string | typeof IgeSceneGraph, options?: any) {
		if (className !== undefined) {
			const classObj = this.getClass(className);

			if (classObj) {
				const classInstance = this.newClassInstance(className);
				this.log("Loading SceneGraph data class: " + classInstance.constructor.name);

				// Make sure the graph class implements the required methods "addGraph" and "removeGraph"
				if (typeof classInstance.addGraph === "function" && typeof classInstance.removeGraph === "function") {
					// Call the class's graph() method passing the options in
					classInstance.addGraph(options);

					// Add the graph instance to the holding array
					this._graphInstances[classInstance.constructor.name] = classInstance;
				} else {
					this.log(
						"Could not load graph for class name \"" +
                        className +
                        "\" because the class does not implement both the require methods \"addGraph()\" and \"removeGraph()\".",
						"error"
					);
				}
			} else {
				this.log(
					"Cannot load graph for class name \"" +
                    className +
                    "\" because the class could not be found. Have you included it in your server/clientConfig.js file?",
					"error"
				);
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
	removeGraph (className?: string, options?: any) {
		if (className !== undefined) {
			const classInstance = this._graphInstances[className];

			if (classInstance) {
				this.log("Removing SceneGraph data class: " + className);

				// Call the class's graph() method passing the options in
				classInstance.removeGraph(options);

				// Now remove the graph instance from the graph instance array
				delete this._graphInstances[className];
			} else {
				this.log(
					"Cannot remove graph for class name \"" +
                    className +
                    "\" because the class instance could not be found. Did you add it via ige.addGraph() ?",
					"error"
				);
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
	enableUpdates (val?: boolean) {
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
	enableRenders (val?: boolean) {
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
	debugEnabled (val?: boolean) {
		if (val !== undefined) {
			if (ige.config.debug) {
				ige.config.debug._enabled = val;
			}
			return this;
		}

		return ige.config.debug._enabled;
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
	debugTiming (val?: boolean) {
		if (val !== undefined) {
			if (ige.config.debug) {
				ige.config.debug._timing = val;
			}
			return this;
		}

		return ige.config.debug._timing;
	}

	debug (eventName: string) {
		if (this._debugEvents[eventName] === true || this._debugEvents[eventName] === this._frames) {
			debugger;
		}
	}

	debugEventOn (eventName: string) {
		this._debugEvents[eventName] = true;
	}

	debugEventOff (eventName: string) {
		this._debugEvents[eventName] = false;
	}

	triggerDebugEventFrame (eventName: string) {
		this._debugEvents[eventName] = this._frames;
	}

	/**
     * Sets the opacity of every object on the scenegraph to
     * zero *except* the one specified by the given id argument.
     * @param {String} id The id of the object not to hide.
     */
	hideAllExcept (id) {
		let i,
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
		let i,
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
				setTimeout(() => {
					callback(new Date().getTime());
				}, 1000 / fpsRate);
			};
		}
	}

	requestAnimFrame (frameHandlerFunction: (timestamp: number, ctx: CanvasRenderingContext2D) => void, element?: Element) {
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
	defineClass (id: string, obj: any) {
		this.igeClassStore[id] = obj;
	}

	/**
     * Retrieves a class by its ID that was defined with
     * a call to defineClass().
     * @param {String} id The ID of the class to retrieve.
     * @return {Object} The class definition.
     */
	getClass (id: string) {
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
	classDefined (id: string) {
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
	newClassInstance (id: string, ...args: any[]) {
		const ClassDefinition = this.getClass(id);
		return new ClassDefinition(this, ...args);
	}

	/**
     * Checks if all engine start dependencies have been satisfied.
     * @return {Boolean}
     */
	dependencyCheck () {
		const arr = this._dependencyQueue;
		let arrCount = arr.length;

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
	viewportDepth (val?: boolean) {
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
	dependencyTimeout (val: number) {
		this._dependencyCheckTimeout = val;
	}

	/**
     * Updates the loading screen DOM elements to show the update progress.
     */
	updateProgress () {
		// Check for a loading progress bar DOM element
		if (!(typeof document !== "undefined" && document.getElementById)) {
			return;
		}

		const elem = document.getElementById("loadingProgressBar"),
			textElem = document.getElementById("loadingText");

		if (!elem) {
			return;
		}

		const totalWidth = (elem.parentNode as HTMLDivElement)?.offsetWidth;
		const currentWidth = Math.floor((totalWidth / this._texturesTotal) * (this._texturesTotal - this._texturesLoading));

		elem.style.width = currentWidth + "px";

		if (!textElem) {
			return;
		}

		if (this._loadingPreText === undefined) {
			// Fill the text to use
			this._loadingPreText = textElem.innerHTML;
		}

		textElem.innerHTML =
            this._loadingPreText +
            " " +
            Math.floor((100 / this._texturesTotal) * (this._texturesTotal - this._texturesLoading)) +
            "%";
	}

	/**
     * Adds one to the number of textures currently loading.
     */
	textureLoadStart (url: string, textureObj: IgeTexture) {
		this._texturesLoading++;
		this._texturesTotal++;

		this.updateProgress();

		this.emit("textureLoadStart", textureObj);
	}

	/**
     * Subtracts one from the number of textures currently loading and if no more need
     * to load, it will also call the _allTexturesLoaded() method.
     */
	textureLoadEnd (url: string, textureObj: IgeTexture) {
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
	textureFromUrl (url: string) {
		const arr = this._textureStore;
		let arrCount = arr.length;

		while (arrCount--) {
			const item = arr[arrCount];
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
	};

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
		return this._canvas !== undefined || this.isServer;
	};

	/**
     * Gets / sets the default smoothing value for all new
     * IgeTexture class instances. If set to true, all newly
     * created textures will have smoothing enabled by default.
     * @param val
     * @return {*}
     */
	globalSmoothing (val?: boolean) {
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
		return String(
			this._idCounter +
            (Math.random() * Math.pow(10, 17) +
                Math.random() * Math.pow(10, 17) +
                Math.random() * Math.pow(10, 17) +
                Math.random() * Math.pow(10, 17))
		);
	}

	/**
     * Generates a new 16-character hexadecimal unique ID
     * @return {String}
     */
	newIdHex () {
		this._idCounter++;
		return (
			this._idCounter +
            (Math.random() * Math.pow(10, 17) +
                Math.random() * Math.pow(10, 17) +
                Math.random() * Math.pow(10, 17) +
                Math.random() * Math.pow(10, 17))
		).toString(16);
	}

	/**
     * Generates a new 16-character hexadecimal ID based on
     * the passed string. Will always generate the same ID
     * for the same string.
     * @param {String} str A string to generate the ID from.
     * @return {String}
     */
	newIdFromString (str?: string) {
		if (str === undefined) {
			return;
		}

		const count = str.length;
		let id,
			val = 0,
			i;

		for (i = 0; i < count; i++) {
			val += str.charCodeAt(i) * Math.pow(10, 17);
		}

		id = val.toString(16);

		// Check if the ID is already in use
		while (this.$(id)) {
			val += Math.pow(10, 17);
			id = val.toString(16);
		}

		return id;
	}

	/**
     * Starts the engine.
     * @param callback
     */
	start (callback: (success: boolean) => void) {
		if (this._state) {
			return;
		}

		if (this.dependencyCheck()) {
			// Start the engine
			this.log("Starting engine...");
			this._state = 1;

			// Check if we have a DOM, that there is an igeLoading element
			// and if so, remove it from the DOM now
			if (this.isClient) {
				if (document.getElementsByClassName && document.getElementsByClassName("igeLoading")) {
					const arr = document.getElementsByClassName("igeLoading");
					let arrCount = arr.length;

					while (arrCount--) {
						arr[arrCount].parentNode?.removeChild(arr[arrCount]);
					}
				}
			}

			this.requestAnimFrame(this.engineStep);

			this.log("Engine started");

			// Fire the callback method if there was one
			if (typeof callback === "function") {
				callback(true);
			}

			return;
		}

		// Get the current timestamp
		const curTime = new Date().getTime();

		// Record when we first started checking for dependencies
		if (!this._dependencyCheckStart) {
			this._dependencyCheckStart = curTime;
		}

		// Check if we have timed out
		if (curTime - this._dependencyCheckStart > this._dependencyCheckTimeout) {
			this.log(
				"Engine start failed because the dependency check timed out after " + this._dependencyCheckTimeout / 1000 + " seconds",
				"error"
			);

			if (typeof callback === "function") {
				callback(false);
			}
		} else {
			// Start a timer to keep checking dependencies
			setTimeout(() => {
				this.start(callback);
			}, 200);
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
	engineStep = (timeStamp: number, ctx?: CanvasRenderingContext2D) => {
		/* TODO:
            Make the scenegraph process simplified. Walk the scenegraph once and grab the order in a flat array
            then process updates and ticks. This will also allow a layered rendering system that can render the
            first x number of entities then stop, allowing a step through of the renderer in realtime.
         */
		const ptArr = this._postTick;
		const ptCount = ptArr.length;

		// Scale the timestamp according to the current
		// engine's time scaling factor
		this.incrementTime(timeStamp, this._timeScaleLastTimestamp);

		this._timeScaleLastTimestamp = timeStamp;
		timeStamp = Math.floor(this._currentTime);

		let st = 0;

		if (ige.config.debug._timing) {
			st = new Date().getTime();
		}

		if (this._state) {
			// Check if we were passed a context to work with
			if (ctx === undefined) {
				ctx = this._ctx as CanvasRenderingContext2D;
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
			const unbornQueue = this._spawnQueue;
			const unbornCount = unbornQueue.length;

			for (let unbornIndex = unbornCount - 1; unbornIndex >= 0; unbornIndex--) {
				const unbornEntity: IgeEntity = unbornQueue[unbornIndex];

				if (this._currentTime >= unbornEntity._bornTime && unbornEntity._birthMount) {
					// Now birth this entity
					unbornEntity.mount(this.$(unbornEntity._birthMount));
					unbornQueue.splice(unbornIndex, 1);
				}
			}

			// Update the scenegraph
			if (this._enableUpdates) {
				if (ige.config.debug._timing) {
					const updateStart = new Date().getTime();
					this.root && this.root.updateSceneGraph(ctx);
					this._updateTime = new Date().getTime() - updateStart;
				} else {
					this.root && this.root.updateSceneGraph(ctx);
				}
			}

			// Render the scenegraph
			if (this._enableRenders) {
				if (!this._useManualRender) {
					if (ige.config.debug._timing) {
						const renderStart = new Date().getTime();
						this.root && this.root.renderSceneGraph(ctx);
						this._renderTime = new Date().getTime() - renderStart;
					} else {
						this.root && this.root.renderSceneGraph(ctx);
					}
				} else {
					if (this._manualRender) {
						if (ige.config.debug._timing) {
							const renderStart = new Date().getTime();
							this.root && this.root.renderSceneGraph(ctx);
							this._renderTime = new Date().getTime() - renderStart;
						} else {
							this.root && this.root.renderSceneGraph(ctx);
						}
						this._manualRender = false;
					}
				}
			}

			// Call post-tick methods
			for (let ptIndex = 0; ptIndex < ptCount; ptIndex++) {
				ptArr[ptIndex]();
			}

			// Record the lastTick value so we can
			// calculate delta on the next tick
			this.lastTick = this._tickStart;
			this._frames++;
			this._dpf = this._drawCount;
			this._drawCount = 0;

			// Call the input system tick to reset any flags etc
			if (this.components.input) {
				(this.components.input as IgeInputComponent).tick();
			}
		}

		this._resized = false;

		if (ige.config.debug._timing) {
			const et = new Date().getTime();
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
	autoSize (val?: boolean) {
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
	createFrontBuffer (autoSize = true, dontScale = false) {
		if (!this.isClient) {
			return;
		}
		if (this._canvas) {
			return;
		}

		this._createdFrontBuffer = true;
		this._pixelRatioScaling = !dontScale;
		this._frontBufferSetup(autoSize, dontScale);
	}

	_frontBufferSetup (autoSize: boolean, dontScale: boolean) {
		// Create a new canvas element to use as the
		// rendering front-buffer
		const tempCanvas = document.createElement("canvas");

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
	log (...args: any[]) {
		console.log(...args);
		if (ige.config.debug._enabled) {
		}

		return this;
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

	/**
     * Load a js script file into memory via a path or url.
     * @param {String} url The file's path or url.
     * @param configFunc
     */
	async requireScript (url: string, configFunc?: (elem: HTMLScriptElement) => void) {
		if (url === undefined) {
			return;
		}

		return new Promise<void>((resolve) => {
			this._requireScriptTotal++;
			this._requireScriptLoading++;
			const elem = document.createElement("script");

			if (configFunc) {
				configFunc(elem);
			}

			elem.addEventListener("load", () => {
				this._requireScriptLoaded(elem);

				setTimeout(() => {
					resolve();
				}, 100);
			});

			document.body.appendChild(elem);
			elem.src = url;

			this.log("Loading script from: " + url);
			this.emit("requireScriptLoading", url);
		});
	}

	/**
     * Called when a js script has been loaded via the requireScript
     * method.
     * @param {Element} elem The script element added to the DOM.
     * @private
     */
	_requireScriptLoaded (elem: HTMLScriptElement) {
		this._requireScriptLoading--;

		this.emit("requireScriptLoaded", elem.src);

		if (this._requireScriptLoading === 0) {
			// All scripts have loaded, fire the engine event
			this.emit("allRequireScriptsLoaded");
		}
	}

	/**
     * Load a css style file into memory via a path or url.
     * @param {String} url The file's path or url.
     */
	async requireStylesheet (url: string) {
		if (url === undefined) {
			throw new Error(`Cannot require a stylesheet with no url!`);
		}

		const css = document.createElement("link");
		css.rel = "stylesheet";
		css.type = "text/css";
		css.media = "all";
		css.href = url;
		document.getElementsByTagName("head")[0].appendChild(css);
		this.log("Load css stylesheet from: " + url);
	}

	sync (method: SyncMethod, attrArr: any) {
		if (!Array.isArray(attrArr)) {
			attrArr = [attrArr];
		}

		this._syncArr = this._syncArr || [];
		this._syncArr.push({ method: method, attrArr: attrArr });

		if (this._syncArr.length === 1) {
			// Start sync waterfall
			this._syncIndex = 0;
			this._processSync();
		}
	}

	_processSync = async () => {
		let syncEntry;

		if (this._syncIndex < this._syncArr.length) {
			syncEntry = this._syncArr[this._syncIndex];

			// Call the method
			await syncEntry.method.apply(this, syncEntry.attrArr);

			this._syncIndex++;

			setTimeout(() => {
				this._processSync();
			}, 1);

			return;
		}

		// Reached end of sync cycle
		this._syncArr = [];
		this._syncIndex = 0;

		this.emit("syncComplete");
	};
}
