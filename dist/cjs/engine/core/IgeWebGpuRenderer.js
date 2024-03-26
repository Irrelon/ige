"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGpuRenderer = void 0;
const IgeBaseRenderer_1 = require("./IgeBaseRenderer.js");
const instance_1 = require("../instance.js");
const _2d_1 = require("../shaders/2d.js");
const buffers_1 = require("../utils/buffers.js");
const gl_matrix_1 = require("gl-matrix");
class IgeWebGpuRenderer extends IgeBaseRenderer_1.IgeBaseRenderer {
    constructor() {
        super();
        this._adapter = null;
        this._device = null;
        this._textureFormat = null;
        this._rectVertexBuffer = null;
        this._rectIndexBuffer = null;
        this._uniformBuffer = null;
        this._uniformsBindGroup = null;
        this._textureBindGroup = null;
        this._uniformValues = null;
        this._pipeline = null;
        this._projectionViewMatrixValue = null;
        this._colorValue = null;
        this._resolutionValue = null;
        this._renderPassDescriptor = null;
        if (!navigator.gpu) {
            this.logError("Cannot use WebGPU renderer because `navigator.gpu` did not return a value");
        }
    }
    _createRectVertexBuffer(device, size = 32) {
        return device.createBuffer({
            label: "rect vertex buffer",
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            size
        });
    }
    _createRectIndexBuffer(device, size = 24) {
        return device.createBuffer({
            label: "rect index buffer",
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            size
        });
    }
    _createTextureFromImage(device, image) {
        return __awaiter(this, void 0, void 0, function* () {
            const texture = device.createTexture({
                size: { width: image.width, height: image.height },
                format: "rgba8unorm",
                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
            });
            const data = yield createImageBitmap(image);
            device.queue.copyExternalImageToTexture({ source: data }, { texture: texture }, { width: image.width, height: image.height });
            const sampler = device.createSampler({
                magFilter: "linear",
                minFilter: "linear"
            });
            return [texture, sampler];
        });
    }
    _createTextureFromURL(device, url) {
        return __awaiter(this, void 0, void 0, function* () {
            const imagePromise = new Promise((resolve, reject) => {
                const image = new Image();
                image.src = url;
                image.onload = () => resolve(image);
                image.onerror = () => {
                    console.error(`Failed to load image ${url}`);
                    reject();
                };
            });
            const image = yield imagePromise;
            return this._createTextureFromImage(device, image);
        });
    }
    _getAdaptor() {
        return __awaiter(this, void 0, void 0, function* () {
            this._adapter = yield navigator.gpu.requestAdapter();
            if (!this._adapter) {
                this.logError("Cannot start because adapter not returned from `navigator.gpu.requestAdapter()`");
            }
        });
    }
    _getDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._adapter) {
                this.logError("Cannot get device because no adaptor is present");
                return;
            }
            this._device = yield this._adapter.requestDevice();
            if (!this._device) {
                this.logError("Cannot start because device not returned from `adapter.requestDevice()`");
            }
            this._device.lost.then(() => {
                this.logError("GPU device has been lost");
                this._device = null;
                return null;
            });
        });
    }
    _getContext() {
        if (!this._canvasElement) {
            throw new Error("No canvas element was found when trying to get context");
        }
        if (!this._adapter)
            return;
        if (!this._device)
            return;
        this._canvasContext = this._canvasElement.getContext("webgpu");
        // If we didn't get a context, fail completely
        if (!this._canvasContext) {
            this.logError("Could not get canvas context, renderer unable to start. This is a critical error that means the engine cannot start.");
            return;
        }
        this._textureFormat = navigator.gpu.getPreferredCanvasFormat();
        this._canvasContext.configure({
            device: this._device,
            format: this._textureFormat,
            alphaMode: "opaque"
        });
    }
    renderSceneGraph(engine, viewports) {
        const ctx = this._canvasContext;
        if (!ctx)
            return false;
        let ts;
        let td;
        if (viewports) {
            //ctx.save();
            //ctx.translate(bounds.x2, bounds.y2);
            //ctx.scale(this._globalScale.x, this._globalScale.y);
            let arrCount = viewports.length;
            // Loop our viewports and call their tick methods
            if (instance_1.ige.config.debug._timing) {
                while (arrCount--) {
                    //ctx.save();
                    ts = new Date().getTime();
                    //arr[arrCount].tick(ctx);
                    td = new Date().getTime() - ts;
                    if (viewports[arrCount]) {
                        if (!instance_1.ige.engine._timeSpentInTick[viewports[arrCount].id()]) {
                            instance_1.ige.engine._timeSpentInTick[viewports[arrCount].id()] = 0;
                        }
                        if (!instance_1.ige.engine._timeSpentLastTick[viewports[arrCount].id()]) {
                            instance_1.ige.engine._timeSpentLastTick[viewports[arrCount].id()] = {};
                        }
                        instance_1.ige.engine._timeSpentInTick[viewports[arrCount].id()] += td;
                        instance_1.ige.engine._timeSpentLastTick[viewports[arrCount].id()].ms = td;
                    }
                    //ctx.restore();
                }
            }
            else {
                while (arrCount--) {
                    //ctx.save();
                    //arr[arrCount].tick(ctx);
                    //ctx.restore();
                    const entity = viewports[arrCount];
                }
            }
            //ctx.restore();
        }
        this._webgpuRender(viewports);
        return super.renderSceneGraph(engine, viewports);
    }
    _createRect(width, height) {
        const indexData = new Uint32Array([
            0, 1, 2,
            2, 1, 3
        ]);
        const vertexData = [
            0, 0,
            width, 0,
            0, height,
            width, height
        ];
        const colorData = [
            1.0, 1.0, 1.0, 1.0, // r g b a
            1.0, 1.0, 1.0, 1.0, // r g b a
            1.0, 1.0, 1.0, 1.0, // r g b a
            1.0, 1.0, 1.0, 1.0 // r g b a
        ];
        // TODO: Need to flip the texture upside down as we are flipping the y in
        // the shader to accommodate painting coords being flipped in canvas space
        // maybe we should do that before sending it to the shader?
        const textureCoordsData = [
            0.0, 0.0, // u, v
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0
        ];
        return {
            indexData,
            vertexData: new Float32Array((0, buffers_1.packArraysByFormat)([0, 0, 1, 1, 1, 1, 2, 2], vertexData, colorData, textureCoordsData))
        };
    }
    _setup() {
        const _super = Object.create(null, {
            _setup: { get: () => super._setup }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super._setup.call(this);
            if (!this._device)
                return;
            if (!this._textureFormat)
                return;
            if (!this._canvasElement)
                return;
            if (!this._canvasContext)
                return;
            const [testTexture, textureSampler] = yield this._createTextureFromURL(this._device, "./uv_test.png");
            const uniformsBindGroupLayout = this._device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: {
                            type: "uniform"
                            //hasDynamicOffset: false,
                            //minBindingSize: uniformBufferRangeData.byteLength
                        }
                    }
                ]
            });
            const textureBindGroupLayout = this._device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {}
                    }
                ]
            });
            const pipelineLayout = this._device.createPipelineLayout({
                bindGroupLayouts: [
                    uniformsBindGroupLayout,
                    textureBindGroupLayout
                ]
            });
            this._pipeline = (0, _2d_1.getPipeline)(this._device, this._textureFormat, pipelineLayout);
            // color, resolution, padding
            const uniformBufferRangeData = (0, buffers_1.bufferRangeData)(Float32Array.BYTES_PER_ELEMENT, // Using float32s (32 bits each, 4 bytes)
            (4 * 4), // Mat4 x 4 floats
            4, // 4 floats
            2 // 2 floats
            );
            // Create a buffer data array
            this._uniformValues = new Float32Array(uniformBufferRangeData.length);
            this._uniformBuffer = this._device.createBuffer({
                label: "uniforms buffer",
                size: (0, buffers_1.getMultipleOf)(16, this._uniformValues.byteLength),
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            // Create a reference to a sub-space inside the buffer (start position, end position)
            this._projectionViewMatrixValue = this._uniformValues.subarray(uniformBufferRangeData.ranges[0][0], uniformBufferRangeData.ranges[0][1]);
            this._colorValue = this._uniformValues.subarray(uniformBufferRangeData.ranges[1][0], uniformBufferRangeData.ranges[1][1]);
            this._resolutionValue = this._uniformValues.subarray(uniformBufferRangeData.ranges[2][0], uniformBufferRangeData.ranges[2][1]);
            // The color will not change so let's set it once at init time
            this._colorValue.set([Math.random(), Math.random(), Math.random(), 1]);
            this._rectVertexBuffer = this._createRectVertexBuffer(this._device, 128);
            this._rectIndexBuffer = this._createRectIndexBuffer(this._device);
            this._uniformsBindGroup = this._device.createBindGroup({
                label: "bind group for uniforms",
                layout: this._pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this._uniformBuffer
                        }
                    }
                ]
            });
            this._textureBindGroup = this._device.createBindGroup({
                label: "bind group for texture",
                layout: this._pipeline.getBindGroupLayout(1),
                entries: [
                    {
                        binding: 0,
                        resource: textureSampler
                    },
                    {
                        binding: 1,
                        resource: testTexture.createView()
                    }
                ]
            });
        });
    }
    _webgpuRender(arr) {
        if (!this._device)
            return;
        if (!this._textureFormat)
            return;
        if (!this._canvasElement)
            return;
        if (!this._canvasContext)
            return;
        if (!this._rectVertexBuffer)
            return;
        if (!this._rectIndexBuffer)
            return;
        if (!this._uniformBuffer)
            return;
        if (!this._pipeline)
            return;
        if (!this._uniformValues)
            return;
        if (!this._projectionViewMatrixValue)
            return;
        if (!this._resolutionValue)
            return;
        const viewport = arr[0];
        if (!viewport)
            return;
        // Get the current texture from the canvas context and
        // set it as the texture to render to.
        this._renderPassDescriptor = {
            label: "default renderPass",
            colorAttachments: [
                {
                    view: this._canvasContext.getCurrentTexture().createView(),
                    loadOp: "clear",
                    storeOp: "store"
                }
            ]
        };
        const encoder = this._device.createCommandEncoder();
        const pass = encoder.beginRenderPass(this._renderPassDescriptor);
        pass.setPipeline(this._pipeline);
        pass.setVertexBuffer(0, this._rectVertexBuffer);
        pass.setIndexBuffer(this._rectIndexBuffer, "uint32");
        pass.setBindGroup(0, this._uniformsBindGroup);
        pass.setBindGroup(1, this._textureBindGroup);
        // TEMP CODE UNTIL WE FIGURE OUT BEST WAY TO HANDLE THIS WITH CAMERA AND VIEWPORT
        const viewMatrix = gl_matrix_1.mat4.lookAt(gl_matrix_1.mat4.create(), [0, 0, 1], [0, 0, 0], [0, 1, 0]);
        const projectionViewMatrix = gl_matrix_1.mat4.create();
        gl_matrix_1.mat4.multiply(projectionViewMatrix, projectionViewMatrix, viewMatrix);
        // Set the uniform values in our JavaScript side Float32Array
        this._projectionViewMatrixValue.set(projectionViewMatrix);
        this._resolutionValue.set([this._canvasElement.width, this._canvasElement.height]);
        // upload the uniform values to the uniform buffer
        this._device.queue.writeBuffer(this._uniformBuffer, 0, this._uniformValues);
        for (let i = 0; i < 100; i++) {
            // The zero here is the position to copy the vertex data into the rectVertexBuffer
            const { vertexData, indexData } = this._createRect(Math.random() * 100, Math.random() * 100);
            this._device.queue.writeBuffer(this._rectVertexBuffer, 0, vertexData);
            this._device.queue.writeBuffer(this._rectIndexBuffer, 0, indexData);
            pass.drawIndexed(indexData.length);
        }
        pass.end();
        const commandBuffer = encoder.finish();
        this._device.queue.submit([commandBuffer]);
    }
    /**
     * Clears the entire canvas.
     */
    clear() {
        if (!(this._canvasElement && this._canvasContext))
            return;
        //this._canvasContext.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
    }
}
exports.IgeWebGpuRenderer = IgeWebGpuRenderer;
