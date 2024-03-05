/// <reference types="@webgpu/types" />
import { IgeBaseRenderer, type IgeBaseRendererProps } from "./IgeBaseRenderer.js"
import type { IgeObject } from "./IgeObject.js"
import type { IgePoint2d } from "./IgePoint2d.js"
import type { IgeCanvasRenderingContext3d } from "../../types/IgeCanvasRenderingContext3d.js"
export interface IgeRenderer3dProps {
    containerElement?: IgeBaseRendererProps["containerElement"];
    canvasElement?: IgeBaseRendererProps["canvasElement"];
}
export declare class IgeRenderer3d extends IgeBaseRenderer {
    _canvasContext?: IgeCanvasRenderingContext3d;
    _adapter: GPUAdapter | null;
    _device: GPUDevice | null;
    constructor({ canvasElement, containerElement }: IgeRenderer3dProps);
    _getAdaptor(): Promise<void>;
    _getDevice(): Promise<void>;
    _getContext(): void;
    renderSceneGraph(arr: IgeObject[], bounds: IgePoint2d): boolean;
    /**
     * Clears the entire canvas.
     */
    clear(): void;
}
