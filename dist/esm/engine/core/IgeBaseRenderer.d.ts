import type { IgeEngine } from "./IgeEngine.js"
import { IgeEventingClass } from "./IgeEventingClass.js";
import { IgePoint2d } from "./IgePoint2d.js"
import type { IgeViewport } from "./IgeViewport.js";
export declare class IgeBaseRenderer extends IgeEventingClass {
    protected _canvas?: HTMLCanvasElement;
    protected _hasRunSetup: boolean;
    protected _isReady: boolean;
    protected _bounds2d: IgePoint2d;
    constructor();
    setup(): Promise<void>;
    /**
     * Implement this setup function in the renderer that extends
     * this base class. Called once by the engine via the setup() function
     * when the renderer is first added. Will not run server-side.
     */
    _setup(): Promise<void>;
    isReady(): boolean;
    isReady(val: boolean): this;
    destroy(): void;
    canvasElement(): HTMLCanvasElement | undefined;
    _resizeEvent: (event?: Event) => void;
    renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
    /**
     * Toggles full-screen output of the renderer canvas. Only works
     * if called from within a user-generated HTML event listener.
     */
    toggleFullScreen: () => void;
    _renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
}
