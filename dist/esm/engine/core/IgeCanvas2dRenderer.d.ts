import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import type { IgeEngine } from "./IgeEngine.js";
import type { IgeViewport } from "./IgeViewport.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js";
export declare class IgeCanvas2dRenderer extends IgeBaseRenderer {
    protected _ctx?: IgeCanvasRenderingContext2d | null;
    protected _createdFrontBuffer: boolean;
    protected _pixelRatioScaling: boolean;
    protected _devicePixelRatio: number;
    protected _autoSize: boolean;
    protected _resized: boolean;
    _setup(): Promise<void>;
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
    /**
     * Gets / sets the canvas element that will be used as the front-buffer.
     * @param elem The canvas element.
     * @param autoSize If set to true, the engine will automatically size
     * the canvas to the width and height of the window upon window resize.
     */
    canvas(elem?: HTMLCanvasElement, autoSize?: boolean): HTMLCanvasElement | this | undefined;
    /**
     * Clears the entire canvas.
     */
    clearCanvas(): void;
    /**
     * Removes the engine's canvas from the DOM.
     */
    removeCanvas(): void;
    _renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
    /**
     * Handles the screen resize event.
     * @param event
     * @private
     */
    _resizeEvent: (event?: Event) => void;
    /**
     * Toggles full-screen output of the main ige canvas. Only works
     * if called from within a user-generated HTML event listener.
     */
    toggleFullScreen: () => any;
    destroy(): void;
    private _frontBufferSetup;
}
