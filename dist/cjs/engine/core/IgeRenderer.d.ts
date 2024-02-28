import type { IgeObject } from "./IgeObject.js"
import { IgePoint2d } from "./IgePoint2d.js";
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
import type { IgeCanvasRenderingContext3d } from "../../types/IgeCanvasRenderingContext3d.js"
import type { IgeRendererMode } from "../../types/IgeRendererMode.js"
export interface IgeRendererProps {
    canvasElement?: HTMLCanvasElement;
    mode?: IgeRendererMode;
}
export declare class IgeRenderer {
    _mode: IgeRendererMode;
    _canvasElement?: HTMLCanvasElement;
    _canvasContext2d?: IgeCanvasRenderingContext2d | null;
    _canvasContext3d?: IgeCanvasRenderingContext3d | null;
    _bounds2d: IgePoint2d;
    _autoSize: boolean;
    _devicePixelRatio: number;
    _resized: boolean;
    constructor({ canvasElement, mode }: IgeRendererProps);
    /**
     * Gets the bounding rectangle for the HTML canvas element being
     * used as the front buffer for the engine. Uses DOM methods.
     * @private
     */
    _canvasPosition(): DOMRect | {
        top: number;
        left: number;
    };
    _updateDevicePixelRatio(): void;
    _resizeEvent: (event?: Event) => void;
    renderSceneGraph(arr: IgeObject[], bounds: IgePoint2d): boolean;
    /**
     * Clears the entire canvas.
     */
    clear(): void;
}
