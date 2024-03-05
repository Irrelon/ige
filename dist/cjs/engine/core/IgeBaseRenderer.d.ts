import { IgeEventingClass } from "./IgeEventingClass.js"
import type { IgeObject } from "./IgeObject.js";
import { IgePoint2d } from "./IgePoint2d.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js";
import type { IgeCanvasRenderingContext3d } from "../../types/IgeCanvasRenderingContext3d.js"
import type { IgeRendererMode } from "../../types/IgeRendererMode.js"
export interface IgeBaseRendererProps {
    canvasElement?: HTMLCanvasElement;
    containerElement?: HTMLElement;
    mode: IgeRendererMode;
}
export declare class IgeBaseRenderer extends IgeEventingClass {
    _hasRunSetup: boolean;
    _isReady: boolean;
    _mode: IgeRendererMode;
    _containerElement?: HTMLElement;
    _canvasElement?: HTMLCanvasElement;
    _canvasContext?: IgeCanvasRenderingContext2d | IgeCanvasRenderingContext3d | null;
    _bounds2d: IgePoint2d;
    _autoSize: boolean;
    _devicePixelRatio: number;
    _resized: boolean;
    constructor({ canvasElement, containerElement, mode }: IgeBaseRendererProps);
    isReady(): boolean;
    setup(): Promise<void>;
    _getAdaptor(): Promise<void>;
    _getDevice(): Promise<void>;
    _createCanvas(): void;
    _getContext(): void;
    _addEventListeners(): void;
    _removeEventListeners(): void;
    destroy(): void;
    /**
     * Gets the bounding rectangle for the HTML canvas element being
     * used as the front buffer for the engine. Uses DOM methods.
     * @private
     */
    _getCanvasElementPosition(): DOMRect | {
        top: number;
        left: number;
    };
    _updateDevicePixelRatio(): void;
    _resizeEvent: (event?: Event) => void;
    renderSceneGraph(arr: IgeObject[], bounds: IgePoint2d): boolean;
    /**
     * Clear the entire canvas.
     */
    clear(): void;
}
