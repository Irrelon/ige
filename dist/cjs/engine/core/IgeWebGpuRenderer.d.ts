/// <reference types="@webgpu/types" />
import { IgeBaseRenderer } from "./IgeBaseRenderer.js"
import type { IgeEngine } from "./IgeEngine.js"
import type { IgeObject } from "./IgeObject.js"
import type { IgeViewport } from "./IgeViewport.js"
import type { IgeCanvasRenderingContext3d } from "../../types/IgeCanvasRenderingContext3d.js"
export declare class IgeWebGpuRenderer extends IgeBaseRenderer {
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
