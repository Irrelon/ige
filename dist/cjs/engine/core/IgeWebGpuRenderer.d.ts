/// <reference types="@webgpu/types" />
import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import type { IgeEngine } from "./IgeEngine.js";
import type { IgeObject } from "./IgeObject.js"
import type { IgeViewport } from "./IgeViewport.js";
import type { IgeCanvasRenderingContext3d } from "../../types/IgeCanvasRenderingContext3d.js"
export declare class IgeWebGpuRenderer extends IgeBaseRenderer {
    classId: string;
    _canvasContext?: IgeCanvasRenderingContext3d;
    _adapter: GPUAdapter | null;
    _device: GPUDevice | null;
    _textureFormat: GPUTextureFormat | null;
    _rectVertexBuffer: GPUBuffer | null;
    _rectIndexBuffer: GPUBuffer | null;
    _uniformBuffer: GPUBuffer | null;
    _uniformsBindGroup: GPUBindGroup | null;
    _textureBindGroup: GPUBindGroup | null;
    _uniformValues: Float32Array | null;
    _pipeline: GPURenderPipeline | null;
    _projectionViewMatrixValue: Float32Array | null;
    _colorValue: Float32Array | null;
    _resolutionValue: Float32Array | null;
    _renderPassDescriptor: GPURenderPassDescriptor | null;
    constructor();
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
    canvasElement(elem?: HTMLCanvasElement, autoSize?: boolean): HTMLCanvasElement | undefined;
    _createRectVertexBuffer(device: GPUDevice, size?: number): GPUBuffer;
    _createRectIndexBuffer(device: GPUDevice, size?: number): GPUBuffer;
    _createTextureFromImage(device: GPUDevice, image: HTMLImageElement): Promise<[GPUTexture, GPUSampler]>;
    _createTextureFromURL(device: GPUDevice, url: string): Promise<[GPUTexture, GPUSampler]>;
    _getAdaptor(): Promise<void>;
    _getDevice(): Promise<void>;
    _getContext(): void;
    renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean;
    _createRect(width: number, height: number): {
        indexData: Uint32Array;
        vertexData: Float32Array;
    };
    _setup(): Promise<void>;
    _webgpuRender(arr: IgeObject[]): void;
    /**
     * Clears the entire canvas.
     */
    clear(): void;
}
