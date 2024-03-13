import { type IgeEngine, type IgeViewport } from "../../export/exports.js"
import { IgeEventingClass } from "./IgeEventingClass.js"
import { IgePoint2d } from "./IgePoint2d.js";
export declare class IgeBaseRenderer extends IgeEventingClass {
    _hasRunSetup: boolean;
    _isReady: boolean;
    _bounds2d: IgePoint2d;
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
    _resizeEvent: (event?: Event) => void;
    renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
    _renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
}
