/// <reference types="@webgpu/types" />
import { IgeBaseRenderer, type IgeBaseRendererProps } from "../core/IgeBaseRenderer.js"
import type { IgeObject } from "../core/IgeObject.js";
import type { IgePoint2d } from "../core/IgePoint2d.js"
import type { IgeCanvasRenderingContext3d } from "../../types/IgeCanvasRenderingContext3d.js";
export interface IgeRendererWebGPUProps {
    containerElement?: IgeBaseRendererProps["containerElement"];
    canvasElement?: IgeBaseRendererProps["canvasElement"];
}
export declare class IgeRendererWebGPU extends IgeBaseRenderer {
    _canvasContext?: IgeCanvasRenderingContext3d;
    _adapter: GPUAdapter | null;
    _device: GPUDevice | null;
    constructor({ canvasElement, containerElement }: IgeRendererWebGPUProps);
    _getAdaptor(): Promise<void>;
    _getDevice(): Promise<void>;
    _getContext(): void;
    renderSceneGraph(arr: IgeObject[], bounds: IgePoint2d): boolean;
    /**
     * Clears the entire canvas.
     */
    clear(): void;
}
