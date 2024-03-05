import { IgeBaseRenderer, type IgeBaseRendererProps } from "./IgeBaseRenderer.js"
import type { IgeObject } from "./IgeObject.js"
import type { IgePoint2d } from "./IgePoint2d.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
export interface IgeRenderer2dProps {
    containerElement?: IgeBaseRendererProps["containerElement"];
    canvasElement?: IgeBaseRendererProps["canvasElement"];
}
export declare class IgeRenderer2d extends IgeBaseRenderer {
    _canvasContext?: IgeCanvasRenderingContext2d;
    constructor({ canvasElement, containerElement }: IgeRenderer2dProps);
    _getContext(): void;
    _updateDevicePixelRatio(): void;
    renderSceneGraph(arr: IgeObject[], bounds: IgePoint2d): boolean;
    /**
     * Clears the entire canvas.
     */
    clear(): void;
}
