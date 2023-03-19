import { IgePoint3d } from "./IgePoint3d";
import { IgeEntity } from "./IgeEntity";
import { IgeObject } from "./IgeObject";
import { IgeDummyCanvas } from "./IgeDummyCanvas";
import { IgeViewport } from "./IgeViewport";
import type { SyncEntry, SyncMethod } from "@/types/SyncEntry";
import type { IgeBaseClass } from "./IgeBaseClass";
import type { IgeCamera } from "./IgeCamera";
import type { IgeSceneGraph } from "./IgeSceneGraph";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { GenericClass } from "@/types/GenericClass";
import type { IgeSceneGraphDataEntry } from "@/types/IgeSceneGraphDataEntry";
import { IgeEngineState } from "@/enums/IgeEngineState";
import { IgeComponent } from "./IgeComponent";
export declare class IgeEngine extends IgeEntity {
    client?: IgeBaseClass;
    server?: IgeBaseClass;
    _idRegistered: boolean;
    _canvas?: HTMLCanvasElement;
    _ctx: IgeCanvasRenderingContext2d | null;
    _idCounter: number;
    _pause: boolean;
    _useManualRender: boolean;
    _manualRenderQueued: boolean;
    _useManualTicks: boolean;
    _manualFrameAlternator: boolean;
    _renderContextModes: string[];
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
    _state: IgeEngineState;
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
    _postTick: (() => void)[];
    _timeSpentInUpdate: Record<string, number>;
    _timeSpentLastUpdate: Record<string, Record<string, number>>;
    _timeSpentInTick: Record<string, number>;
    _timeSpentLastTick: Record<string, Record<string, number>>;
    _timeScale: number;
    _tickStart: number;
    _globalScale: IgePoint3d;
    _graphInstances: Record<string, IgeSceneGraph>;
    _spawnQueue: IgeObject[];
    _headless: boolean;
    _dependencyQueue: (() => boolean)[];
    _secondTimer: number;
    _loggedATL?: boolean;
    _dependencyCheckStart?: number;
    _dependencyCheckTimeout: number;
    _debugEvents: Record<string, boolean | number>;
    _autoSize?: boolean;
    _syncIndex: number;
    _syncArr: SyncEntry[];
    _webFonts: FontFace[];
    _cssFonts: string[];
    _mouseOverVp?: IgeViewport;
    _deviceFinalDrawRatio: number;
    _createdFrontBuffer: boolean;
    _devicePixelRatio: number;
    _backingStoreRatio: number;
    _resized: boolean;
    _timeScaleLastTimestamp: number;
    lastTick: number;
    _alwaysInView: boolean;
    basePath: string;
    _requestAnimFrame?: (callback: (time: number, ctx?: IgeCanvasRenderingContext2d) => void, element?: Element) => void;
    constructor();
    addComponent(id: string, Component: typeof IgeComponent<IgeEngine>, options?: any): this;
    id(): string;
    id(id: string): this;
    loadWebFont(family: string, url: string): void;
    fontsLoaded: () => boolean;
    waitForCssFont(fontName: string): void;
    fontList(): string[];
    /**
     * Adds an entity to the spawn queue.
     * @param {IgeEntity} entity The entity to add.
     * @returns {Ige|[]} Either this, or the spawn queue.
     */
    spawnQueue(entity: IgeObject): this | IgeObject[];
    currentViewport(viewport?: IgeObject): IgeViewport | null;
    /**
     * Sets the canvas element that will be used as the front-buffer.
     * @param elem The canvas element.
     * @param autoSize If set to true, the engine will automatically size
     * the canvas to the width and height of the window upon window resize.
     */
    canvas(elem?: HTMLCanvasElement, autoSize?: boolean): this | HTMLCanvasElement | undefined;
    /**
     * Clears the entire canvas.
     */
    clearCanvas(): void;
    /**
     * Removes the engine's canvas from the DOM.
     */
    removeCanvas(): void;
    createCanvas(options?: {
        smoothing: boolean;
        pixelRatioScaling: boolean;
    }): {
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
    };
    _setInternalCanvasSize(canvas: HTMLCanvasElement | IgeDummyCanvas, ctx: IgeCanvasRenderingContext2d, newWidth: number, newHeight: number): void;
    /**
     * Handles the screen resize event.
     * @param event
     * @private
     */
    _resizeEvent: (event?: Event) => void;
    /**
     * Gets the bounding rectangle for the HTML canvas element being
     * used as the front buffer for the engine. Uses DOM methods.
     * @returns {ClientRect}
     * @private
     */
    _canvasPosition(): DOMRect | {
        top: number;
        left: number;
    };
    /**
     * Toggles full-screen output of the main ige canvas. Only works
     * if called from within a user-generated HTML event listener.
     */
    toggleFullScreen: () => any;
    /**
     * Finds the first Ige* based class that the passed object
     * has been derived from.
     * @param obj
     * @return {*}
     */
    findBaseClass: (obj: any) => string;
    /**
     * Returns an array of all classes the passed object derives from
     * in order from current to base.
     * @param obj
     * @param arr
     * @return {*}
     */
    getClassDerivedList(obj: any, arr?: any[]): any[];
    /**
     * Is called every second and does things like calculate the current FPS.
     * @private
     */
    _secondTick: () => void;
    /**
     * Gets / sets the current time scalar value. The engine's internal
     * time is multiplied by this value, and it's default is 1. You can set it to
     * 0.5 to slow down time by half or 1.5 to speed up time by half. Negative
     * values will reverse time but not all engine systems handle this well
     * at the moment.
     * @param {Number=} val The timescale value.
     * @returns {*}
     */
    timeScale(val?: number): number | this;
    /**
     * Increments the engine's internal time by the passed number of milliseconds.
     * @param {Number} val The number of milliseconds to increment time by.
     * @param {Number=} lastVal The last internal time value, used to calculate
     * delta internally in the method.
     * @returns {Number}
     */
    incrementTime(val: number, lastVal?: number): number;
    /**
     * Get the current time from the engine.
     * @return {Number} The current time.
     */
    currentTime(): number;
    /**
     * Gets / sets the pause flag. If set to true then the engine's
     * internal time will no longer increment and will instead stay static.
     * @param val
     * @returns {*}
     */
    pause(val?: boolean): boolean | this;
    /**
     * Gets / sets the option to determine if the engine should
     * schedule its own ticks or if you want to manually advance
     * the engine by calling tick when you wish to.
     * @param {Boolean=} val
     * @return {*}
     */
    useManualTicks(val?: boolean): boolean | this;
    /**
     * Schedules a manual tick.
     */
    manualTick(): void;
    /**
     * Gets / sets the option to determine if the engine should
     * render on every tick or wait for a manualRender() call.
     * @param {Boolean=} val True to enable manual rendering, false
     * to disable.
     * @return {*}
     */
    useManualRender(val?: boolean): boolean | this;
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
    manualRender(): void;
    fps(): number;
    dpf(): number;
    dps(): number;
    analyseTiming(): void;
    /**
     * Walks the scene graph and outputs a console map of the graph.
     */
    sceneGraph(obj?: IgeEntity, currentDepth?: number): void;
    /**
     * Walks the scenegraph and returns a data object of the graph.
     */
    getSceneGraphData(rootObject?: IgeObject, noRef?: boolean): IgeSceneGraphDataEntry;
    /**
     * Adds a scenegraph class into memory.
     * @param {String|Object} className The name of the scenegraph class, or the class itself.
     * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
     * @returns {*}
     */
    addGraph(className: string | typeof IgeSceneGraph, options?: any): Promise<this>;
    /**
     * Removes a scenegraph class into memory.
     * @param {String} className The name of the scenegraph class.
     * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
     * @returns {*}
     */
    removeGraph(className?: string | typeof IgeSceneGraph, options?: any): Promise<this>;
    /**
     * Allows the update() methods of the entire scenegraph to
     * be temporarily enabled or disabled. Useful for debugging.
     * @param {Boolean=} val If false, will disable all update() calls.
     * @returns {*}
     */
    enableUpdates(val?: boolean): boolean | this;
    /**
     * Allows the tick() methods of the entire scenegraph to
     * be temporarily enabled or disabled. Useful for debugging.
     * @param {Boolean=} val If false, will disable all tick() calls.
     * @returns {*}
     */
    enableRenders(val?: boolean): boolean | this;
    /**
     * Enables or disables the engine's debug mode. Enabled by default.
     * @param {Boolean=} val If true, will enable debug mode.
     * @returns {*}
     */
    debugEnabled(val?: boolean): boolean | this;
    /**
     * Enables or disables the engine's debug timing system. The
     * timing system will time all update and rendering code down
     * the scenegraph and is useful for tracking long-running code
     * but comes with a small performance penalty when enabled.
     * Enabled by default.
     * @param {Boolean=} val If true, will enable debug timing mode.
     * @returns {*}
     */
    debugTiming(val?: boolean): boolean | this;
    debug(eventName: string): void;
    debugEventOn(eventName: string): void;
    debugEventOff(eventName: string): void;
    triggerDebugEventFrame(eventName: string): void;
    /**
     * Sets the opacity of every object on the scenegraph to
     * zero *except* the one specified by the given id argument.
     * @param {String} id The id of the object not to hide.
     */
    hideAllExcept(id: string): void;
    /**
     * Calls the show() method for every object on the scenegraph.
     */
    showAll(): void;
    /**
     * Sets the frame rate at which new engine steps are fired.
     * Setting this rate will override the default requestAnimFrame()
     * method as defined in IgeBaseClass.js and on the client-side, will
     * stop usage of any available requestAnimationFrame() method
     * and will use a setTimeout()-based version instead.
     * @param {Number} fpsRate
     */
    setFps(fpsRate: number): void;
    requestAnimFrame(frameHandlerFunction: (timestamp: number, ctx?: IgeCanvasRenderingContext2d) => void, element?: Element): void;
    showStats(): void;
    /**
     * Retrieves a class by its ID that was defined with
     * a call to defineClass().
     * @param {String} id The ID of the class to retrieve.
     * @return {Object} The class definition.
     */
    getClass(id: string | GenericClass): GenericClass;
    /**
     * Returns true if the class specified has been defined.
     * @param {String} id The ID of the class to check for.
     * @returns {*}
     */
    classDefined(id: string): boolean;
    /**
     * Generates a new instance of a class defined with a call
     * to the defineClass() method. Passes the options
     * parameter to the new class during it's constructor call.
     * @param id
     * @param args
     * @return {*}
     */
    newClassInstance(id: string | GenericClass, ...args: any[]): any;
    /**
     * Checks if all engine start dependencies have been satisfied.
     * @return {Boolean}
     */
    dependencyCheck(): boolean;
    /**
     * Gets / sets the flag that determines if viewports should be sorted by depth
     * like regular entities, before they are processed for rendering each frame.
     * Depth-sorting viewports increases processing requirements so if you do not
     * need to stack viewports in a particular order, keep this flag false.
     * @param {Boolean} val
     * @return {Boolean}
     */
    viewportDepth(val?: boolean): boolean | this;
    /**
     * Sets the number of milliseconds before the engine gives up waiting for dependencies
     * to be satisfied and cancels the startup procedure.
     * @param val
     */
    dependencyTimeout(val: number): void;
    /**
     * Updates the loading screen DOM elements to show the update progress.
     */
    updateProgress(): void;
    /**
     * Checks to ensure that a canvas has been assigned to the engine or that the
     * engine is in server mode.
     * @return {Boolean}
     */
    canvasReady: () => boolean;
    /**
     * Gets / sets the default smoothing value for all new
     * IgeTexture class instances. If set to true, all newly
     * created textures will have smoothing enabled by default.
     * @param val
     * @return {*}
     */
    globalSmoothing(val?: boolean): boolean | this;
    /**
     * Generates a new 16-character hexadecimal ID based on
     * the passed string. Will always generate the same ID
     * for the same string.
     * @param {String} str A string to generate the ID from.
     * @return {String}
     */
    newIdFromString(str?: string): string | undefined;
    /**
     * Starts the engine or rejects the promise with an error.
     */
    start(): Promise<unknown>;
    /**
     * Stops the engine.
     * @return {Boolean}
     */
    stop(): boolean;
    /**
     * Called each frame to traverse and render the scenegraph.
     */
    engineStep: (timeStamp: number, ctx?: IgeCanvasRenderingContext2d | null) => void;
    /**
     * Gets / sets the _autoSize property. If set to true, the engine will listen
     * for any change in screen size and resize the front-buffer (canvas) element
     * to match the new screen size.
     * @param val
     * @return {Boolean}
     */
    autoSize(val?: boolean): boolean | this | undefined;
    pixelRatioScaling(val?: boolean): boolean | this;
    /**
     * Gets / sets the rendering context that will be used when getting the
     * context from canvas elements.
     * @param {String=} contextId The context such as '2d'. Defaults to '2d'.
     * @return {*}
     */
    renderContext(contextId: "2d" | "three"): this | "2d" | "three";
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
    createFrontBuffer(autoSize?: boolean, dontScale?: boolean): void;
    _frontBufferSetup(autoSize: boolean, dontScale: boolean): void;
    /**
     * Returns the mouse position relative to the main front buffer. Mouse
     * position is set by the this.input component (IgeInputComponent)
     * @return {IgePoint3d}
     */
    mousePos(): IgePoint3d;
    /**
     * Walks the scenegraph and returns an array of all entities that the mouse
     * is currently over, ordered by their draw order from drawn last (above other
     * entities) to first (underneath other entities).
     */
    mouseOverList: (obj?: IgeEntity, entArr?: IgeEntity[]) => IgeEntity[];
    _childMounted(child: IgeObject): void;
    updateSceneGraph(ctx: IgeCanvasRenderingContext2d): void;
    renderSceneGraph(ctx: IgeCanvasRenderingContext2d): void;
    destroy(): this;
    /**
     * Load a js script file into memory via a path or url.
     * @param {String} url The file's path or url.
     * @param configFunc
     */
    requireScript(url: string, configFunc?: (elem: HTMLScriptElement) => void): Promise<void>;
    /**
     * Called when a js script has been loaded via the requireScript
     * method.
     * @param {Element} elem The script element added to the DOM.
     * @private
     */
    _requireScriptLoaded(elem: HTMLScriptElement): void;
    /**
     * Load a css style file into memory via a path or url.
     * @param {String} url The file's path or url.
     */
    requireStylesheet(url: string): Promise<void>;
    sync(method: SyncMethod, attrArr: any): void;
    _processSync: () => Promise<void>;
}
