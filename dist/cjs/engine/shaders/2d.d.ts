/// <reference types="@webgpu/types" />
export declare const vertexDataFormat: number[];
export declare const getShaderModule: (device: GPUDevice) => GPUShaderModule;
export declare const getPipeline: (device: GPUDevice, textureFormat: GPUTextureFormat, pipelineLayout: GPUPipelineLayout) => GPURenderPipeline;
