import type { IgeBaseRenderer } from "@/engine/core/IgeBaseRenderer";
import type { IgeBaseClass } from "@/export/exports";
import type { IgeCamera } from "@/export/exports";
import type { IgeComponent } from "@/export/exports";
import type { IgeDummyCanvas } from "@/export/exports";
import { IgeEntity } from "@/export/exports";
import type { IgeObject } from "@/export/exports";
import { IgePoint2d } from "@/export/exports";
import { IgePoint3d } from "@/export/exports";
import type { IgeSceneGraph } from "@/export/exports";
import { IgeViewport } from "@/export/exports";
import { ige } from "@/export/exports";
import { IgeBehaviourType } from "@/export/exports";
import { IgeEngineState } from "@/export/exports";
import { isClient, isServer, isWorker } from "@/export/exports";
import type { GenericClass } from "@/export/exports";
import type { IgeCanvasRenderingContext2d } from "@/export/exports";
import type { IgeSceneGraphDataEntry } from "@/export/exports";
import type { SyncEntry, SyncMethod } from "@/export/exports";

export class IgeEngine extends IgeEntity {
	classId = "IgeEngine";
	client?: IgeBaseClass;
	server?: IgeBaseClass;
	_idRegistered: boolean = true;
	_renderer?: IgeBaseRenderer | null = null;
	_idCounter: number;
	_pause: boolean = false;
	_useManualRender: boolean = false;
	_manualRenderQueued: boolean = false;
	_useManualTicks: boolean = false;
	_manualFrameAlternator: boolean = false;
	_pixelRatioScaling: boolean;
	_requireScriptTotal: number;
	_requireScriptLoading: number;
	_loadingPreText?: string;
	_enableUpdates: boolean;
	_enableRenders: boolean;
	_showSgTree: boolean;
	_renderContext: "2d" | "three";
	_tickTime: number;
	_updateTime: number;
	_renderTime: number;
	_tickDelta: number;
	_fpsRate: number;
	_state: IgeEngineState = IgeEngineState.stopped;
	_drawCount: number;
	_dps: number;
	_dpf: number;
	_frames: number;
	_fps: number;
	_clientNetDiff: number;
	_frameAlternator: boolean;
	_viewportDepth: boolean = false;
	_pointerPos: IgePoint3d;
	_currentViewport: IgeViewport | null;
	_currentCamera: IgeCamera | null;
	_currentTime: number;
	_globalSmoothing: boolean;
	_timeSpentInUpdate: Record<string, number>;
	_timeSpentLastUpdate: Record<string, Record<string, number>>;
	_timeSpentInTick: Record<string, number>;
	_timeSpentLastTick: Record<string, Record<string, number>>;
	_timeScale: number;
	_tickStart: number = 0;
	_globalScale: IgePoint3d;
	_graphInstances: Record<string, IgeSceneGraph>;
	_spawnQueue: IgeObject[];
	_headless: boolean;
	_dependencyQueue: (() => boolean)[];
	_secondTimer: number;
	_loggedATL?: boolean;
	_dependencyCheckStart?: number;
	_dependencyCheckTimeout: number = 5000; // Wait 30 seconds to load all dependencies then timeout;
	_debugEvents: Record<string, boolean | number>;
	_autoSize: boolean = true;
	_syncIndex: number = 0;
	_syncArr: SyncEntry[] = [];
	_webFonts: FontFace[];
	_cssFonts: string[];
	_devicePixelRatio: number = 1;
	_createdFrontBuffer: boolean = false;
	_resized: boolean = false;
	_timeScaleLastTimestamp: number = 0;
	lastTick: number = 0;

	// The engine entity is always "in view" as in, no occlusion will stop it from rendering
	// because it's only the child entities that need occlusion testing
	_alwaysInView = true;
	basePath = "";
	_requestAnimFrame?: (
		callback: (time: number, ctx?: IgeCanvasRenderingContext2d) => void,
		element?: Element
	) => void;

	constructor () {
		super();

		this._idCounter = 0;
		this._pixelRatioScaling = true; // Default to scaling the canvas to get non-blurry output
		this._requireScriptTotal = 0;
		this._requireScriptLoading = 0;
		this._loadingPreText = undefined; // The text to put in front of the loading percent on the loading progress screen
		this._enableUpdates = true;
		this._enableRenders = true;
		this._showSgTree = false;
		this._debugEvents = {}; // Holds debug event booleans for named events
		this._renderContext = "2d"; // The rendering context, default is 2d
		this._tickTime = NaN; // The time the tick took to process
		this._updateTime = NaN; // The time the tick update section took to process
		this._renderTime = NaN; // The time the tick render section took to process
		this._tickDelta = 0; // The time between the last tick and the current one
		this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
		this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
		this._dps = 0; // Number of draws that occurred last tick
		this._dpf = 0;
		this._frames = 0; // Number of frames looped through since last second tick
		this._fps = 0; // Number of frames per second
		this._clientNetDiff = 0; // The difference between the server and client comms (only non-zero on clients)
		this._frameAlternator = false; // Is set to the boolean not of itself each frame
		this._viewportDepth = false;
		this._pointerPos = new IgePoint3d(0, 0, 0);
		this._currentViewport = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
		this._currentCamera = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
		this._currentTime = 0; // The current engine time
		this._globalSmoothing = false; // Determines the default smoothing setting for new textures
		this._timeSpentInUpdate = {}; // An object holding time-spent-in-update (total time spent in this object's update method)
		this._timeSpentLastUpdate = {}; // An object holding time-spent-last-update (time spent in this object's update method last tick)
		this._timeSpentInTick = {}; // An object holding time-spent-in-tick (total time spent in this object's tick method)
		this._timeSpentLastTick = {}; // An object holding time-spent-last-tick (time spent in this object's tick method last tick)
		this._timeScale = 1; // The default time scaling factor to speed up or slow down engine time
		this._globalScale = new IgePoint3d(1, 1, 1);
		this._graphInstances = {}; // Holds an array of instances of graph classes
		this._spawnQueue = []; // Holds an array of entities that are yet to be born
		this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
		this._webFonts = []; // Holds an array of web fonts to load
		this._cssFonts = []; // Holds an array of css fonts we want to wait for (loaded via HTML or CSS rather than our own loadWebFont())
		this._headless = true;

		// Output our header
		console.log("-----------------------------------------");
		console.log(`Powered by Isogenic Engine`);
		console.log("(C)opyright " + new Date().getFullYear() + " Irrelon Software Limited");
		console.log("https://www.isogenicengine.com");
		console.log("-----------------------------------------");

		// Set the initial id as the current time in milliseconds. This ensures that under successive
		// restarts of the engine, new ids will still always be created compared to earlier runs -
		// which is important when storing persistent data with ids etc
		this._idCounter = new Date().getTime();

		// Start a timer to record every second of execution
		this._secondTimer = setInterval(this._secondTick, 1000) as unknown as number;

		if (isClient) {
			this._resizeEvent();
		}
	}

	renderer (val: IgeBaseRenderer): this;
	renderer (): IgeBaseRenderer | null;
	renderer (val?: IgeBaseRenderer) {
		if (val === undefined) {
			return this._renderer;
		}

		this._renderer = val;

		// Make sure the renderer has been setup
		void val.setup();

		return this;
	}

	addComponent (id: string, Component: typeof IgeComponent<IgeEngine>, options?: any): this {
		return super.addComponent(id, Component as typeof IgeComponent, options);
	}

	id (): string;
	id (id: string): this;
	id (id?: string): this | string | undefined {
		if (!id) {
			return "ige";
		}

		return this;
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

		const arr: string[] = [];
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
	 * Gets / sets the headless flag in the engine denoting
	 * if the engine is in non-render mode or not.
	 */
	headless (): boolean;
	headless (val: boolean): this;
	headless (val?: boolean) {
		if (val === undefined) {
			return this._headless;
		}

		this._headless = val;
		return this;
	}

	/**
	 * Adds an entity to the spawn queue.
	 * @param {IgeEntity} entity The entity to add.
	 * @returns {Ige|[]} Either this, or the spawn queue.
	 */
	spawnQueue (entity: IgeObject) {
		if (entity !== undefined) {
			this._spawnQueue.push(entity);
			return this;
		}

		return this._spawnQueue;
	}

	currentViewport (viewport?: IgeObject) {
		if (viewport instanceof IgeViewport) {
			ige.engine._currentViewport = viewport;
			ige.engine._currentCamera = viewport.camera;
		}

		return ige.engine._currentViewport;
	}

	createCanvas (options = { smoothing: false, pixelRatioScaling: true }) {
		// Creates a new canvas instance with the device pixel ratio
		// and other features setup based on the passed `options` or
		// current ige settings if no options are provided. This is a
		// safe way to generate a new canvas for things like caching
		// stores or whatever
		const canvas = new OffscreenCanvas(2, 2);

		// Get the context
		const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

		if (!ctx) {
			throw new Error("Could not get canvas rendering context!");
		}

		// Set smoothing mode
		ctx.imageSmoothingEnabled = options.smoothing !== undefined ? options.smoothing : this._globalSmoothing;

		const pixelRatioScaling =
			options.pixelRatioScaling !== undefined ? options.pixelRatioScaling : this._pixelRatioScaling;

		if (pixelRatioScaling) {
			// Scale the canvas context to account for the device pixel ratio
			ctx.scale(this._devicePixelRatio, this._devicePixelRatio);
		}

		return {
			canvas,
			ctx
		};
	}

	_setInternalCanvasSize (
		canvas: OffscreenCanvas | IgeDummyCanvas,
		ctx: IgeCanvasRenderingContext2d,
		newWidth: number,
		newHeight: number
	) {
		canvas.width = newWidth * this._devicePixelRatio;
		canvas.height = newHeight * this._devicePixelRatio;

		// Scale the canvas context to account for the change
		ctx.scale(this._devicePixelRatio, this._devicePixelRatio);
	}

	/**
	 * Handles the screen resize event.
	 * @param event
	 * @private
	 */
	_resizeEvent = (event?: Event) => {
		if (!this._autoSize) return;

		const arr = this._children;
		const newWidth = window.innerWidth;
		const newHeight = window.innerHeight;
		let arrCount = arr.length;

		this._bounds2d = new IgePoint2d(newWidth, newHeight);

		// Loop any mounted children and check if
		// they should also get resized
		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}

		// if (this._showSgTree) {
		// 	const sgTreeElem = document.getElementById("igeSgTree");
		//
		// 	if (sgTreeElem) {
		// 		canvasBoundingRect = this._canvasPosition();
		//
		// 		sgTreeElem.style.top = canvasBoundingRect.top + 5 + "px";
		// 		sgTreeElem.style.left = canvasBoundingRect.left + 5 + "px";
		// 		sgTreeElem.style.height = this._bounds2d.y - 30 + "px";
		// 	}
		// }

		this._resized = true;
	};

	/**
	 * Toggles full-screen output of the renderer canvas. Only works
	 * if called from within a user-generated HTML event listener.
	 */
	toggleFullScreen = () => {
		this._renderer?.toggleFullScreen();
	};

	/**
	 * Finds the first Ige* based class that the passed object
	 * has been derived from.
	 * @param obj
	 * @return {*}
	 */
	findBaseClass = (obj: any): string => {
		if (obj && obj.constructor && obj.constructor.name) {
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
	getClassDerivedList (obj: any, arr?: any[]) {
		if (!arr) {
			arr = [];
		} else {
			if (obj && obj.constructor && obj.constructor.name) {
				arr.push(obj.constructor.name);
			}
		}

		if (obj && obj.__proto__ && obj.__proto__.constructor && obj.__proto__.constructor.name) {
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
	 * time is multiplied by this value, and it's default is 1. You can set it to
	 * 0.5 to slow down time by half or 1.5 to speed up time by half. Negative
	 * values will reverse time but not all engine systems handle this well
	 * at the moment.
	 * @param {number=} val The timescale value.
	 * @returns {*}
	 */
	timeScale (val?: number) {
		if (val !== undefined) {
			this._timeScale = val;
			return this;
		}

		return this._timeScale;
	}

	/**
	 * Increments the engine's internal time by the passed number of milliseconds.
	 * @param {number} val The number of milliseconds to increment time by.
	 * @param {number=} lastVal The last internal time value, used to calculate
	 * delta internally in the method.
	 * @returns {number}
	 */
	incrementTime (val: number, lastVal?: number) {
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
	 * @return {number} The current time.
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
	pause (val?: boolean) {
		if (val !== undefined) {
			this._pause = val;
			return this;
		}

		return this._pause;
	}

	/**
	 * Gets / sets the option to determine if the engine should
	 * schedule its own ticks or if you want to manually advance
	 * the engine by calling tick when you wish to.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	useManualTicks (): boolean;
	useManualTicks (val: boolean): IgeEngine;
	useManualTicks (val?: boolean): boolean | IgeEngine {
		if (val !== undefined) {
			this._useManualTicks = val;
			this._manualFrameAlternator = !this._frameAlternator; // Set this otherwise the first manual frame won't fire
			return this;
		}

		return this._useManualTicks;
	}

	/**
	 * Schedules a manual tick.
	 */
	manualTick () {
		return new Promise<void>((resolve, reject) => {
			if (this._manualFrameAlternator !== this._frameAlternator) {
				this._manualFrameAlternator = this._frameAlternator;
				this.requestAnimFrame((timeStamp: number) => {
					this.engineStep(timeStamp);
					resolve();
				});
			} else {
				reject(new Error("Manual tick still in progress"));
			}
		});
	}

	/**
	 * Gets / sets the option to determine if the engine should
	 * render on every tick or wait for a manualRender() call.
	 * @param {Boolean=} val True to enable manual rendering, false
	 * to disable.
	 * @return {*}
	 */
	useManualRender (val?: boolean) {
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
		this._manualRenderQueued = true;
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

	// TODO: Fix this so it works in typescript
	// saveSceneGraph (item?: {obj?: IgeObject, str?: any}) {
	// 	if (!item) {
	// 		item = this.getSceneGraphData();
	// 	}
	//
	// 	if (item.obj.stringify) {
	// 		item.str = item.obj.stringify();
	// 	} else {
	// 		console.log("Class " + item.constructor.name + " has no stringify() method! For object: " + item.id, item.obj);
	// 	}
	//
	// 	const arr = item.items;
	//
	// 	if (arr) {
	// 		const arrCount = arr.length;
	//
	// 		for (let i = 0; i < arrCount; i++) {
	// 			this.saveSceneGraph(arr[i]);
	// 		}
	// 	}
	//
	// 	return item;
	// }

	/**
	 * Walks the scene graph and outputs a console map of the graph.
	 */
	sceneGraph (obj?: IgeEntity, currentDepth?: number) {
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
			obj = this;
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

			console.log(
				depthSpace +
				obj.id() +
				" (" +
				obj.constructor.name +
				") : " +
				obj._inView +
				" Timing(" +
				timingString +
				")"
			);
		} else {
			console.log(depthSpace + obj.id() + " (" + obj.constructor.name + ") : " + obj._inView);
		}

		currentDepth++;

		if (obj === this) {
			// Loop the viewports
			arr = obj._children as IgeViewport[];

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					const vp = arr[arrCount];
					if (vp._scene) {
						if (vp._scene._shouldRender) {
							if (ige.config.debug._timing) {
								timingString = "";

								timingString += "T: " + this._timeSpentInTick[vp.id()];
								if (this._timeSpentLastTick[vp.id()]) {
									if (typeof this._timeSpentLastTick[vp.id()].ms === "number") {
										timingString += " | LastTick: " + this._timeSpentLastTick[vp.id()].ms;
									}

									if (typeof this._timeSpentLastTick[vp.id()].depthSortChildren === "number") {
										timingString +=
											" | ChildDepthSort: " + this._timeSpentLastTick[vp.id()].depthSortChildren;
									}
								}

								console.log(
									depthSpace +
									"----" +
									vp.id() +
									" (" +
									vp.constructor.name +
									") : " +
									vp._inView +
									" Timing(" +
									timingString +
									")"
								);
							} else {
								console.log(
									depthSpace + "----" + vp.id() + " (" + vp.constructor.name + ") : " + vp._inView
								);
							}
							this.sceneGraph(vp._scene, currentDepth + 1);
						}
					}
				}
			}
		} else {
			arr = obj._children as IgeEntity[];

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
	getSceneGraphData (rootObject?: IgeObject, noRef?: boolean) {
		const items: IgeSceneGraphDataEntry[] = [];
		let finalRootObject: IgeObject | IgeEntity;

		if (rootObject) {
			finalRootObject = rootObject;
		} else {
			// Set the obj to the main ige instance
			finalRootObject = this;
		}

		const item: IgeSceneGraphDataEntry = {
			text: "[" + finalRootObject.constructor.name + "] " + finalRootObject.id(),
			id: finalRootObject.id(),
			classId: finalRootObject.constructor.name
		};

		if (!noRef) {
			item.parent = finalRootObject._parent;
			item.obj = finalRootObject;
		} else {
			if (finalRootObject._parent) {
				item.parentId = finalRootObject._parent.id();
			} else {
				item.parentId = "sceneGraph";
			}
		}

		if (finalRootObject === this) {
			// Loop the viewports
			const arr = finalRootObject._children as IgeViewport[];

			if (arr) {
				let arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					const vp = arr[arrCount];

					const tempItem: IgeSceneGraphDataEntry = {
						text: "[" + vp.constructor.name + "] " + vp.id(),
						id: vp.id(),
						classId: vp.constructor.name
					};

					if (!noRef) {
						tempItem.parent = vp._parent;
						tempItem.obj = vp;
					} else {
						if (vp._parent) {
							tempItem.parentId = vp._parent.id();
						}
					}

					if (vp.camera) {
						// Add the viewport camera as an object on the scenegraph
						const tempCam: IgeSceneGraphDataEntry = {
							text: "[IgeCamera] " + vp.id(),
							id: vp.camera.id(),
							classId: vp.camera.constructor.name
						};

						if (!noRef) {
							tempCam.parent = vp;
							tempCam.obj = vp.camera;
						} else {
							tempCam.parentId = vp.id();
						}

						if (vp._scene) {
							const tempItem2 = this.getSceneGraphData(vp._scene, noRef);
							tempItem.items = [tempCam, tempItem2];
						}
					} else {
						if (vp._scene) {
							const tempItem2 = this.getSceneGraphData(vp._scene, noRef);
							tempItem.items = [tempItem2];
						}
					}

					items.push(tempItem);
				}
			}
		} else {
			const arr = finalRootObject._children;

			if (arr) {
				let arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					const tempItem = this.getSceneGraphData(arr[arrCount], noRef);
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
	 * @param {string|Object} className The name of the scenegraph class, or the class itself.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	async addGraph (className: string | typeof IgeSceneGraph, options?: any) {
		if (className !== undefined) {
			const classObj = this.getClass(className);

			if (!classObj) {
				throw new Error(
					`Cannot load graph for class name "${className}" because the class could not be found. Did you call registerClass(ClassName)?`
				);
			}

			const classInstance = this.newClassInstance(className);
			this.log("Loading SceneGraph data class: " + classInstance.constructor.name);

			// Make sure the graph class implements the required methods "addGraph" and "removeGraph"
			if (typeof classInstance.addGraph !== "function" || typeof classInstance.removeGraph !== "function") {
				throw new Error(
					`Could not load graph for class name "${className}" because the class does not implement both the require methods "addGraph()" and "removeGraph()".`
				);
			}

			// Call the class's addGraph() method passing the options in
			await classInstance.addGraph(options);

			// Add the graph instance to the holding array
			this._graphInstances[classInstance.constructor.name] = classInstance;
		}

		return this;
	}

	/**
	 * Removes a scenegraph class into memory.
	 * @param {string} className The name of the scenegraph class.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	async removeGraph (className?: string | typeof IgeSceneGraph, options?: any) {
		if (className !== undefined) {
			const classObj = this.getClass(className);
			const classInstance = this._graphInstances[classObj.name];

			if (classInstance) {
				this.log(`Removing SceneGraph data class: ${classObj.name}`);

				// Call the class's removeGraph() method passing the options in
				await classInstance.removeGraph(options);

				// Now remove the graph instance from the graph instance array
				delete this._graphInstances[classObj.name];
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
	 * @param {string} id The id of the object not to hide.
	 */
	hideAllExcept (id: string) {
		const arr = ige.register.all() as unknown as IgeEntity[];

		for (const key in arr) {
			if (key !== id && "opacity" in arr[key]) {
				arr[key].opacity(0);
			}
		}
	}

	/**
	 * Calls the show() method for every object on the scenegraph.
	 */
	showAll () {
		const arr = ige.register.all() as unknown as IgeEntity[];

		for (const key in arr) {
			if ("show" in arr[key]) {
				arr[key].show();
			}
		}
	}

	/**
	 * Sets the frame rate at which new engine steps are fired.
	 * Setting this rate will override the default requestAnimFrame()
	 * method as defined in IgeBaseClass.js and on the client-side, will
	 * stop usage of any available requestAnimationFrame() method
	 * and will use a setTimeout()-based version instead.
	 * @param {number} fpsRate
	 */
	setFps (fpsRate: number) {
		// Override the default requestAnimFrame handler and set
		// our own method up so that we can control the frame rate
		this.requestAnimFrame = (callback) => {
			setTimeout(() => {
				callback(new Date().getTime());
			}, 1000 / fpsRate);
		};
	}

	requestAnimFrame (
		frameHandlerFunction: (timestamp: number, ctx?: IgeCanvasRenderingContext2d) => void,
		element?: Element
	) {
		if (isClient) {
			globalThis.requestAnimationFrame(frameHandlerFunction);
			return;
		}

		setTimeout(function () {
			frameHandlerFunction(new Date().getTime());
		}, 1000 / 60);
	}

	showStats () {
		this.log(
			"showStats has been removed from the ige in favour of the new editor component, please remove this call from your code."
		);
	}

	/**
	 * Retrieves a class by its ID that was defined with
	 * a call to defineClass().
	 * @param {string} id The ID of the class to retrieve.
	 * @return {Object} The class definition.
	 */
	getClass (id: string | GenericClass) {
		if (typeof id === "object" || typeof id === "function") {
			return id;
		}
		return ige.classStore[id];
	}

	/**
	 * Returns true if the class specified has been defined.
	 * @param {string} id The ID of the class to check for.
	 * @returns {*}
	 */
	classDefined (id: string) {
		return Boolean(ige.classStore[id]);
	}

	/**
	 * Generates a new instance of a class defined with a call
	 * to the defineClass() method. Passes the options
	 * parameter to the new class during it's constructor call.
	 * @param id
	 * @param args
	 * @return {*}
	 */
	newClassInstance (id: string | GenericClass, ...args: any[]) {
		const ClassDefinition = this.getClass(id);
		return new ClassDefinition(...args);
	}

	/**
	 * Checks if all engine start dependencies have been satisfied.
	 * @return {boolean}
	 */
	dependencyCheck (): boolean {
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
		const currentWidth = Math.floor(
			(totalWidth / ige.textures._assetsTotal) * (ige.textures._assetsTotal - ige.textures._assetsLoading)
		);

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
			Math.floor((100 / ige.textures._assetsTotal) * (ige.textures._assetsTotal - ige.textures._assetsLoading)) +
			"%";
	}

	/**
	 * Checks to ensure that a canvas has been assigned to the engine or that the
	 * engine is in server mode.
	 * @return {boolean}
	 */
	canvasReady = (): boolean => {
		//return this._canvas !== undefined || isWorker || isServer;
		return this._renderer?.isReady() || isWorker || isServer;
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
	 * Generates a new 16-character hexadecimal ID based on
	 * the passed string. Will always generate the same ID
	 * for the same string.
	 * @param {string} str A string to generate the ID from.
	 * @return {string}
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
		while (ige.$(id)) {
			val += Math.pow(10, 17);
			id = val.toString(16);
		}

		return id;
	}

	/**
	 * Starts the engine or rejects the promise with an error.
	 */
	start () {
		return new Promise((resolve, reject) => {
			// Check if the state is anything other than zero (stopped)
			if (this._state === IgeEngineState.started) {
				return resolve(true);
			}

			if (isClient && this._dependencyQueue.length === 0) {
				// Add the textures loaded dependency
				this._dependencyQueue.push(ige.textures.haveAllTexturesLoaded);
				this._dependencyQueue.push(this.canvasReady);
				this._dependencyQueue.push(this.fontsLoaded);
			}

			const doDependencyCheck = () => {
				if (this.dependencyCheck()) {
					// Start the engine
					this.log("Starting engine...");
					this._state = IgeEngineState.started;

					// Check if we have a DOM, that there is an igeLoading element
					// and if so, remove it from the DOM now
					if (isClient && !isWorker) {
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

					return resolve(true);
				}

				// Get the current timestamp
				const curTime = new Date().getTime();

				// Record when we first started checking for dependencies
				if (!this._dependencyCheckStart) {
					this._dependencyCheckStart = curTime;
				}

				// Check if we have timed out
				if (curTime - this._dependencyCheckStart > this._dependencyCheckTimeout) {
					return reject(
						new Error(
							"Engine start failed because the dependency check timed out after " +
							this._dependencyCheckTimeout / 1000 +
							" seconds"
						)
					);
				}

				setTimeout(doDependencyCheck, 200);
			};

			doDependencyCheck();
		});
	}

	/**
	 * Stops the engine.
	 * @return {boolean}
	 */
	stop (): boolean {
		// If we are running, stop the engine
		if (this._state) {
			this.log("Stopping engine...");
			this._state = IgeEngineState.stopped;

			return true;
		} else {
			return false;
		}
	}

	_birthUnbornEntities () {
		const unbornQueue = this._spawnQueue;
		const unbornCount = unbornQueue.length;

		for (let unbornIndex = unbornCount - 1; unbornIndex >= 0; unbornIndex--) {
			const unbornEntity: IgeObject = unbornQueue[unbornIndex];

			if (this._currentTime >= unbornEntity._bornTime && unbornEntity._birthMount) {
				// Now birth this entity
				unbornEntity.mount(ige.$(unbornEntity._birthMount) as IgeEntity);

				// Remove the newly born entity from the spawn queue
				unbornQueue.splice(unbornIndex, 1);
			}
		}
	}

	/**
	 * Called each frame to traverse and render the scenegraph.
	 */
	engineStep = (timeStamp: number) => {
		/* TODO:
            Make the scenegraph process simplified. Walk the scenegraph once and grab the order in a flat array
            then process updates and ticks. This will also allow a layered rendering system that can render the
            first x number of entities then stop, allowing a step through of the renderer in realtime.
            We can probably implement this in the new renderer subsystem.
         */

		// Scale the timestamp according to the current
		// engine's time scaling factor
		this.incrementTime(timeStamp, this._timeScaleLastTimestamp);

		this._timeScaleLastTimestamp = timeStamp;
		timeStamp = Math.floor(this._currentTime);

		let startTime = 0;

		if (ige.config.debug._timing) {
			startTime = new Date().getTime();
		}

		if (this._state === IgeEngineState.started) {
			// Alternate the boolean frame alternator flag
			this._frameAlternator = !this._frameAlternator;

			// If the engine is not in manual tick mode...
			if (!this._useManualTicks) {
				// Schedule a new frame
				this.requestAnimFrame(this.engineStep);
			} else {
				this._manualFrameAlternator = !this._frameAlternator;
			}

			// Record the tick start time and adjust the tickStart value
			// by the difference between the server and the client clocks
			// (this is only applied when running as the client - the
			// server always has a clientNetDiff of zero)
			this._tickStart = timeStamp - this._clientNetDiff;

			if (!this.lastTick) {
				// This is the first time we've run so set the tick delta
				// to zero
				this._tickDelta = 0;
			} else {
				// Calculate the tick delta - how much time has elapsed
				// between the last time we ran engineStep() and now
				this._tickDelta = this._tickStart - this.lastTick;
			}

			// Check for unborn entities that should be born now
			this._birthUnbornEntities();

			// Check if updates are enabled
			if (this._enableUpdates) {
				// Process any behaviours assigned to the engine
				this._processBehaviours(IgeBehaviourType.preUpdate, this._tickDelta);

				// Update the scenegraph
				if (ige.config.debug._timing) {
					const updateStart = new Date().getTime();
					this.updateSceneGraph();
					this._updateTime = new Date().getTime() - updateStart;
				} else {
					this.updateSceneGraph();
				}

				this._processBehaviours(IgeBehaviourType.postUpdate, this._tickDelta);
			}

			// Check if renders are enabled
			if (this._enableRenders) {
				this._processBehaviours(IgeBehaviourType.preTick, this._tickDelta);

				// Check if we should only render after manualRender() has been called
				// or if we just render each frame automatically
				if (this._useManualRender) {
					// We are only rendering when manualRender() is called, check if
					// a manual render has been queued by calling manualRender()
					if (this._manualRenderQueued) {
						// A manual render was queued, so we can render a frame now
						if (ige.config.debug._timing) {
							const renderStart = new Date().getTime();
							this.renderSceneGraph();
							this._renderTime = new Date().getTime() - renderStart;
						} else {
							this.renderSceneGraph();
						}
						this._manualRenderQueued = false;
					}
				} else {
					// We are not in manual render mode so render the scenegraph
					if (ige.config.debug._timing) {
						const renderStart = new Date().getTime();
						this.renderSceneGraph();
						this._renderTime = new Date().getTime() - renderStart;
					} else {
						this.renderSceneGraph();
					}
				}

				// Call post-tick methods
				this._processBehaviours(IgeBehaviourType.postTick);
			}

			// Record the lastTick value, so we can
			// calculate delta on the next tick
			this.lastTick = this._tickStart;
			this._frames++;

			// Record the number of drawings we've done this frame in our
			// dpf (draws per frame) counter
			this._dpf = this._drawCount;

			// Clear the draw count, so it's zero for the next frame
			this._drawCount = 0;
		}

		this._resized = false;

		if (ige.config.debug._timing) {
			const endTime = new Date().getTime();
			this._tickTime = endTime - startTime;
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

	pixelRatioScaling (val?: boolean) {
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
	renderContext (contextId: "2d" | "three") {
		if (contextId !== undefined) {
			this._renderContext = contextId;

			this.log("Rendering mode set to: " + contextId);

			return this;
		}

		return this._renderContext;
	}

	/**
	 * @deprecated Please create a renderer instance and assign it via engine.renderer() instead.
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
		throw new Error("IgeEngine.createFrontBuffer() is now deprecated, please assign a renderer instead e.g. `ige.engine.renderer(new IgeCanvas2dRenderer());`");
	}

	/**
	 * Returns the mouse position relative to the main front buffer. Mouse
	 * position is set by the this.input component (IgeInputComponent)
	 * @return {IgePoint3d}
	 */
	mousePos () {
		return ige._pointerPos.clone();
	}

	/**
	 * Walks the scenegraph and returns an array of all entities that the mouse
	 * is currently over, ordered by their draw order from drawn last (above other
	 * entities) to first (underneath other entities).
	 */
	pointerOverList = (obj?: IgeEntity, entArr: IgeEntity[] = []) => {
		let arr,
			arrCount,
			mp,
			mouseTriggerPoly,
			first = false;

		if (!obj) {
			obj = this;
			entArr = [];
			first = true;
		}

		if (obj === this) {
			// Loop viewports
			arr = obj._children as IgeViewport[];

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					const vp = arr[arrCount];

					if (vp._scene) {
						if (vp._scene._shouldRender) {
							this.pointerOverList(vp._scene, entArr);
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
			arr = obj._children as IgeEntity[];

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					this.pointerOverList(arr[arrCount], entArr);
				}
			}
		}

		if (first) {
			entArr.reverse();
		}

		return entArr;
	};

	_childMounted (child: IgeObject) {
		if (child instanceof IgeViewport) {
			// The first mounted viewport gets set as the current
			// one before any rendering is done
			if (!ige.engine._currentViewport) {
				ige.engine.currentViewport(child);
			}
		}

		super._childMounted(child);
	}

	updateSceneGraph () {
		const arr = this._children;
		const tickDelta = ige.engine._tickDelta;

		if (arr) {
			let arrCount = arr.length;

			// Loop our viewports and call their update methods
			if (ige.config.debug._timing) {
				while (arrCount--) {
					const us = new Date().getTime();
					arr[arrCount].update(tickDelta);
					const ud = new Date().getTime() - us;

					if (arr[arrCount]) {
						if (!ige.engine._timeSpentInUpdate[arr[arrCount].id()]) {
							ige.engine._timeSpentInUpdate[arr[arrCount].id()] = 0;
						}

						if (!ige.engine._timeSpentLastUpdate[arr[arrCount].id()]) {
							ige.engine._timeSpentLastUpdate[arr[arrCount].id()] = {};
						}

						ige.engine._timeSpentInUpdate[arr[arrCount].id()] += ud;
						ige.engine._timeSpentLastUpdate[arr[arrCount].id()].ms = ud;
					}
				}
			} else {
				while (arrCount--) {
					arr[arrCount].update(tickDelta);
				}
			}
		}
	}

	renderSceneGraph () {
		let ts: number, td: number;

		// Depth-sort the viewports
		if (this._viewportDepth) {
			if (ige.config.debug._timing) {
				ts = new Date().getTime();
				this.depthSortChildren();
				td = new Date().getTime() - ts;

				if (!ige.engine._timeSpentLastTick[this.id()]) {
					ige.engine._timeSpentLastTick[this.id()] = {};
				}

				ige.engine._timeSpentLastTick[this.id()].depthSortChildren = td;
			} else {
				this.depthSortChildren();
			}
		}

		// Hand rendering tasks to the renderer
		this._renderer?.renderSceneGraph(this, this._children as IgeViewport[]);

		// ctx.save();
		// ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
		// //ctx.scale(this._globalScale.x, this._globalScale.y);
		//
		// // Process the current engine tick for all child objects
		// const arr = this._children;
		//
		// if (arr) {
		// 	let arrCount = arr.length;
		//
		// 	// Loop our viewports and call their tick methods
		// 	if (ige.config.debug._timing) {
		// 		while (arrCount--) {
		// 			ctx.save();
		// 			ts = new Date().getTime();
		// 			arr[arrCount].tick(ctx);
		// 			td = new Date().getTime() - ts;
		// 			if (arr[arrCount]) {
		// 				if (!ige.engine._timeSpentInTick[arr[arrCount].id()]) {
		// 					ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
		// 				}
		//
		// 				if (!ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
		// 					ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
		// 				}
		//
		// 				ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
		// 				ige.engine._timeSpentLastTick[arr[arrCount].id()].ms = td;
		// 			}
		// 			ctx.restore();
		// 		}
		// 	} else {
		// 		while (arrCount--) {
		// 			ctx.save();
		// 			arr[arrCount].tick(ctx);
		// 			ctx.restore();
		// 		}
		// 	}
		// }
		//
		// ctx.restore();
	}

	destroy () {
		// Stop the engine and kill any timers
		this.stop();

		// Remove the front buffer (canvas) if we created it
		if (isClient) {
			this._renderer?.destroy();
		}

		super.destroy();

		this.log("Engine destroy complete.");
		return this;
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

	/**
	 * Returns the engine's children as an array of IgeViewport
	 * instances.
	 * @example #Get the viewports array
	 *     const vpArray = ige.engine.children();
	 * @return {Array} The array of IgeViewport instances.
	 */
	children (): IgeViewport[] {
		// Children of the ige.engine are ONLY IgeViewports
		return this._children as IgeViewport[];
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * its bounds drawn when the bounds for all objects are being drawn.
	 * In order for bounds to be drawn the viewport the object is being drawn
	 * to must also have draw bounds enabled.
	 * @example #Enable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(true);
	 * @example #Disable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawBounds());
	 * @return {*}
	 * @param id
	 * @param recursive
	 */
	drawBounds (id: boolean, recursive?: boolean): this;
	drawBounds (): boolean;
	drawBounds (val?: boolean, recursive: boolean = false) {
		if (val === undefined) {
			return this._drawBounds;
		}

		this._drawBounds = val;

		if (recursive) {
			this.children().forEach((child) => {
				child.drawBounds(val, recursive);
				child._scene?.drawBounds(val, recursive);
			});
		}

		return this;
	}
}
