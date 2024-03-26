import { getPipeline } from "@/engine/shaders/2d";
import { bufferRangeData, getMultipleOf, packArraysByFormat } from "@/engine/utils/buffers";
import { IgeBaseRenderer } from "@/engine/core/IgeBaseRenderer";
import type { IgeCanvasRenderingContext3d } from "@/types/IgeCanvasRenderingContext3d";
import { mat4 } from "gl-matrix";

export class IgeWebGpuRenderer extends IgeBaseRenderer {
	_canvasContext?: IgeCanvasRenderingContext3d;
	_adapter: GPUAdapter | null = null;
	_device: GPUDevice | null = null;
	_textureFormat: GPUTextureFormat | null = null;
	_rectVertexBuffer: GPUBuffer | null = null;
	_rectIndexBuffer: GPUBuffer | null = null;
	_uniformBuffer: GPUBuffer | null = null;
	_uniformsBindGroup: GPUBindGroup | null = null;
	_textureBindGroup: GPUBindGroup | null = null;
	_uniformValues: Float32Array | null = null;
	_pipeline: GPURenderPipeline | null = null;
	_projectionViewMatrixValue: Float32Array | null = null;
	_colorValue: Float32Array | null = null;
	_resolutionValue: Float32Array | null = null;
	_renderPassDescriptor: GPURenderPassDescriptor | null = null;

	constructor () {
		super();

		if (!navigator.gpu) {
			this.logError("Cannot use WebGPU renderer because `navigator.gpu` did not return a value");
		}
	}

	_createRectVertexBuffer (device: GPUDevice, size = 32) {
		return device.createBuffer({
			label: "rect vertex buffer",
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
			size
		});
	}

	_createRectIndexBuffer (device: GPUDevice, size = 24) {
		return device.createBuffer({
			label: "rect index buffer",
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
			size
		});
	}

	async _createTextureFromImage (device: GPUDevice, image: HTMLImageElement): Promise<[GPUTexture, GPUSampler]> {
		const texture = device.createTexture({
			size: { width: image.width, height: image.height },
			format: "rgba8unorm",
			usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
		});

		const data = await createImageBitmap(image);

		device.queue.copyExternalImageToTexture(
			{ source: data },
			{ texture: texture },
			{ width: image.width, height: image.height }
		);

		const sampler = device.createSampler({
			magFilter: "linear",
			minFilter: "linear"
		});

		return [texture, sampler];
	}

	async _createTextureFromURL (device: GPUDevice, url: string) {
		const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.src = url;
			image.onload = () => resolve(image);
			image.onerror = () => {
				console.error(`Failed to load image ${url}`);
				reject();
			};
		});

		const image = await imagePromise;
		return this._createTextureFromImage(device, image);
	}

	async _getAdaptor () {
		this._adapter = await navigator.gpu.requestAdapter();

		if (!this._adapter) {
			this.logError("Cannot start because adapter not returned from `navigator.gpu.requestAdapter()`");
		}
	}

	async _getDevice () {
		if (!this._adapter) {
			this.logError("Cannot get device because no adaptor is present");
			return;
		}

		this._device = await this._adapter.requestDevice();

		if (!this._device) {
			this.logError("Cannot start because device not returned from `adapter.requestDevice()`");
		}

		this._device.lost.then(() => {
			this.logError("GPU device has been lost");
			this._device = null;
			return null;
		});
	}

	_getContext () {
		if (!this._canvasElement) {
			throw new Error("No canvas element was found when trying to get context");
		}
		if (!this._adapter) return;
		if (!this._device) return;

		this._canvasContext = this._canvasElement.getContext("webgpu") as GPUCanvasContext;

		// If we didn't get a context, fail completely
		if (!this._canvasContext) {
			this.logError(
				"Could not get canvas context, renderer unable to start. This is a critical error that means the engine cannot start."
			);
			return;
		}

		this._textureFormat = navigator.gpu.getPreferredCanvasFormat();

		this._canvasContext.configure({
			device: this._device,
			format: this._textureFormat,
			alphaMode: "opaque"
		});
	}

	renderSceneGraph (arr: IgeObject[], bounds: IgePoint2d): boolean {
		const ctx = this._canvasContext;
		if (!ctx) return false;

		let ts: number;
		let td: number;

		if (arr) {
			//ctx.save();
			//ctx.translate(bounds.x2, bounds.y2);
			//ctx.scale(this._globalScale.x, this._globalScale.y);
			let arrCount = arr.length;

			// Loop our viewports and call their tick methods
			if (ige.config.debug._timing) {
				while (arrCount--) {
					//ctx.save();
					ts = new Date().getTime();
					//arr[arrCount].tick(ctx);
					td = new Date().getTime() - ts;
					if (arr[arrCount]) {
						if (!ige.engine._timeSpentInTick[arr[arrCount].id()]) {
							ige.engine._timeSpentInTick[arr[arrCount].id()] = 0;
						}

						if (!ige.engine._timeSpentLastTick[arr[arrCount].id()]) {
							ige.engine._timeSpentLastTick[arr[arrCount].id()] = {};
						}

						ige.engine._timeSpentInTick[arr[arrCount].id()] += td;
						ige.engine._timeSpentLastTick[arr[arrCount].id()].ms = td;
					}
					//ctx.restore();
				}
			} else {
				while (arrCount--) {
					//ctx.save();
					//arr[arrCount].tick(ctx);
					//ctx.restore();
					const entity = arr[arrCount];
				}
			}

			//ctx.restore();
		}

		this._webgpuRender(arr);

		return super.renderSceneGraph(arr, bounds);
	}

	_createRect (width: number, height: number) {
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
			1.0, 1.0, 1.0, 1.0,  // r g b a
			1.0, 1.0, 1.0, 1.0,  // r g b a
			1.0, 1.0, 1.0, 1.0,  // r g b a
			1.0, 1.0, 1.0, 1.0  // r g b a
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
			vertexData: new Float32Array(packArraysByFormat([0, 0, 1, 1, 1, 1, 2, 2], vertexData, colorData, textureCoordsData))
		};
	}

	async _setup (): Promise<void> {
		await super._setup();
		window.mat4 = mat4;
		if (!this._device) return;
		if (!this._textureFormat) return;
		if (!this._canvasElement) return;
		if (!this._canvasContext) return;

		const [testTexture, textureSampler] = await this._createTextureFromURL(this._device, "./uv_test.png");

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

		this._pipeline = getPipeline(this._device, this._textureFormat, pipelineLayout);

		// color, resolution, padding
		const uniformBufferRangeData = bufferRangeData(
			Float32Array.BYTES_PER_ELEMENT, // Using float32s (32 bits each, 4 bytes)
			(4 * 4), // Mat4 x 4 floats
			4, // 4 floats
			2 // 2 floats
		);

		// Create a buffer data array
		this._uniformValues = new Float32Array(uniformBufferRangeData.length);

		this._uniformBuffer = this._device.createBuffer({
			label: "uniforms buffer",
			size: getMultipleOf(16, this._uniformValues.byteLength),
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
	}

	_webgpuRender (arr: IgeObject[]) {
		if (!this._device) return;
		if (!this._textureFormat) return;
		if (!this._canvasElement) return;
		if (!this._canvasContext) return;
		if (!this._rectVertexBuffer) return;
		if (!this._rectIndexBuffer) return;
		if (!this._uniformBuffer) return;
		if (!this._pipeline) return;
		if (!this._uniformValues) return;
		if (!this._projectionViewMatrixValue) return;
		if (!this._resolutionValue) return;

		const viewport = arr[0] as IgeViewport;

		if (!viewport) return;

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

		// Set the uniform values in our JavaScript side Float32Array
		this._projectionViewMatrixValue.set(viewport.camera._projectionViewMatrix);
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
	clear () {
		if (!(this._canvasElement && this._canvasContext)) return;
		//this._canvasContext.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
	}
}
