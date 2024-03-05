async function setup () {
	if (!navigator.gpu) {
		console.error("WebGPU cannot be initialized - navigator.gpu not found");
		return null;
	}
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		console.error("WebGPU cannot be initialized - Adapter not found");
		return null;
	}
	const device = await adapter.requestDevice();
	device.lost.then(() => {
		console.error("WebGPU cannot be initialized - Device has been lost");
		return null;
	});

	const canvas = document.getElementById("render");
	if (!canvas) {
		console.error("WebGPU cannot be initialized - Canvas does not exist");
		return null;
	}
	const context = canvas.getContext("webgpu");
	if (!context) {
		console.error("WebGPU cannot be initialized - Canvas does not support WebGPU");
		return null;
	}
	const devicePixelRatio = window.devicePixelRatio || 1;
	const presentationSize = [canvas.clientWidth * devicePixelRatio, canvas.clientHeight * devicePixelRatio];
	const textureFormat = navigator.gpu.getPreferredCanvasFormat();

	context.configure({
		device,
		format: textureFormat,
		alphaMode: "premultiplied"
	});

	return {adapter, device, canvas, context, textureFormat};
}

function createRect (width, height) {
	const vertexData = new Float32Array([
		0, 0,
		width, 0,
		0, height,
		width, height
	]);

	const indexData = new Uint32Array([
		0,  1,  2,
		2,  1,  3,
	]);

	const colorData = new Float32Array([
		1.0, 1.0, 1.0, 1.0,  // r g b a
		1.0, 1.0, 1.0, 1.0,  // r g b a
		1.0, 1.0, 1.0, 1.0,  // r g b a
		1.0, 1.0, 1.0, 1.0,  // r g b a
		1.0, 1.0, 1.0, 1.0,  // r g b a
		1.0, 1.0, 1.0, 1.0,  // r g b a
	]);

	// TODO: Need to flip the texture upside down as we are flipping the y in
	// the shader to accommodate painting coords being flipped in canvas space
	// maybe we should do that before sending it to the shader?
	const textureCoordsData = new Float32Array([
		0.0, 1.0, // u, v
		1.0, 1.0,
		0.0, 0.0,
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0
	]);

	return {
		vertexData,
		indexData,
		colorData,
		textureCoordsData,
		numVertices: indexData.length,
	};
}

function createRectVertexBuffer (device, size = 32) {
	return device.createBuffer({
		label: 'rect vertex buffer',
		size,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
	});
}

function createRectColorBuffer (device, size = 96) {
	return device.createBuffer({
		label: 'rect color buffer',
		size,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
	});
}

function createRectIndexBuffer (device, size = 24) {
	return device.createBuffer({
		label: 'rect index buffer',
		size,
		usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
	});
}

function createRectTextureCoordsBuffer (device, size = 48) {
	return device.createBuffer({
		label: 'rect vertex buffer',
		size,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
	});
}

function createBufferWithData(device, data) {
	const buffer = device.createBuffer({
		size: data.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		mappedAtCreation: true
	});

	new Float32Array(buffer.getMappedRange()).set(data);
	buffer.unmap();

	return buffer;
}

async function createTextureFromImage (device, image) {
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

async function createTextureFromURL (device, url) {
	const imagePromise = new Promise((resolve, reject) => {
		const image = new Image();
		image.src = url;
		image.onload = () => resolve(image);
		image.onerror = () => {
			console.error(`Failed to load image ${url}`);
			reject();
		}
	});

	const image = await imagePromise;
	return createTextureFromImage(device, image);
}

async function start () {
	const {adapter, device, canvas, context, textureFormat} = await setup();
	const [testTexture, textureSampler] = await createTextureFromURL(device, "./uv_test.png");

	// color, resolution, padding
	const uniformBufferSize = (4 + 2) * (4 + 8);
	const uniformBuffer = device.createBuffer({
		label: 'uniforms',
		size: uniformBufferSize,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	});

	// offsets to the various uniform values in float32 indices
	const kColorOffset = 0;
	const kResolutionOffset = 4;

	// Create a buffer
	const uniformValues = new Float32Array(uniformBufferSize / 4);

	// Create a reference to a sub-space inside the buffer (start position, end position)
	const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
	const resolutionValue = uniformValues.subarray(kResolutionOffset, kResolutionOffset + 2);

	// The color will not change so let's set it once at init time
	colorValue.set([Math.random(), Math.random(), Math.random(), 1]);

	const rectVertexBuffer = createRectVertexBuffer(device);
	const rectColorBuffer = createRectColorBuffer(device)
	const rectIndexBuffer = createRectIndexBuffer(device);
	const rectTextureCoordsBuffer = createRectTextureCoordsBuffer(device);

	const vertexBufferLayout = {
		arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // 2 floats * 4 bytes per float
		attributes: [
			{
				shaderLocation: 0,
				offset: 0,
				format: "float32x2" // 2 floats
			}
		],
		stepMode: "vertex"
	};

	const colorBufferLayout = {
		arrayStride: 4 * Float32Array.BYTES_PER_ELEMENT, // rgba * 4 bytes per float
		attributes: [
			{
				shaderLocation: 1,
				offset: 0,
				format: "float32x4" // 4 floats
			}
		],
		stepMode: "vertex"
	};

	const textureCoordsLayout = {
		arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // 2 floats * 4 bytes per float
		attributes: [
			{
				shaderLocation: 2,
				offset: 0,
				format: "float32x2" // 2 floats
			}
		],
		stepMode: "vertex"
	}

	const shaderModule = device.createShaderModule({
		code: `
struct Uniforms {
  color: vec4f,
  resolution: vec2f,
};
 
struct Vertex {
  @location(0) position: vec2f,  // xy
  @location(1) color: vec4f,  // rgba
  @location(2) texCoords: vec2f, // uv
};

struct Instance {
  @builtin(instance_index) instance: u32,
}
 
struct VertexShaderResult {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) texCoords: vec2f,
}; 
 
@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(1) @binding(0) var texSampler: sampler;
@group(1) @binding(1) var texture: texture_2d<f32>;
 
@vertex fn vs(vert: Vertex, @builtin(instance_index) instance: u32) -> VertexShaderResult {
  var vsOut: VertexShaderResult;
  
  let i = f32(instance);
  let position = vert.position;
 
  // convert the position from pixels to a 0.0 to 1.0 value
  let zeroToOne = position / uni.resolution;
 
  // convert from 0 <-> 1 to 0 <-> 2
  let zeroToTwo = zeroToOne * 2.0;
 
  // covert from 0 <-> 2 to -1 <-> +1 (clip space)
  let flippedClipSpace = zeroToTwo - 1.0;
 
  // flip Y
  let clipSpace = flippedClipSpace * vec2f(1, -1);
 
  vsOut.position = vec4f(clipSpace, 0.0, 1.0);
  vsOut.color = vert.color;
  vsOut.texCoords = vert.texCoords;
  
  return vsOut;
}
 
@fragment fn fs(fragData: VertexShaderResult) -> @location(0) vec4f {
  var textureColor = textureSample(texture, texSampler, fragData.texCoords);
  return fragData.color * textureColor;
}
    `
	});

	const uniformsBindGroupLayout = device.createBindGroupLayout({
		entries: [
			{
				binding: 0,
				visibility: GPUShaderStage.VERTEX,
				buffer: {
					type:"uniform",
					hasDynamicOffset: false,
					minBindingSize: 32
				}
			}
		]
	});

	const textureBindGroupLayout = device.createBindGroupLayout({
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

	const pipelineLayout = device.createPipelineLayout({
		bindGroupLayouts: [
			uniformsBindGroupLayout,
			textureBindGroupLayout
		]
	});

	const pipeline = device.createRenderPipeline({
		label: 'just 2d position',
		layout: pipelineLayout,
		vertex: {
			module: shaderModule,
			entryPoint: 'vs',
			buffers: [
				vertexBufferLayout,
				colorBufferLayout,
				textureCoordsLayout
			]
		},
		fragment: {
			module: shaderModule,
			entryPoint: 'fs',
			targets: [{
				format: textureFormat,
				blend: {
					color: {
						srcFactor: "one",
						dstFactor: "one-minus-src-alpha",
						operation: "add"
					},
					alpha: {
						srcFactor: "one",
						dstFactor: "one-minus-src-alpha",
						operation: "add"
					}
				}
			}],
		}
	});

	const uniformsBindGroup = device.createBindGroup({
		label: 'bind group for uniforms',
		layout: uniformsBindGroupLayout,
		entries: [
			{
				binding: 0,
				resource: {
					buffer: uniformBuffer
				}
			},
		],
	});

	const textureBindGroup = device.createBindGroup({
		label: 'bind group for texture',
		layout: textureBindGroupLayout,
		entries: [
			{
				binding: 0,
				resource: textureSampler
			},
			{
				binding: 1,
				resource: testTexture.createView()
			}
		],
	});

	const renderPassDescriptor = {
		label: 'our basic canvas renderPass',
		colorAttachments: [
			{
				// view: <- to be filled out when we render
				loadOp: 'clear',
				storeOp: 'store',
			},
		],
	};

	function render() {
		// Get the current texture from the canvas context and
		// set it as the texture to render to.
		renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

		const { vertexData, indexData, colorData, textureCoordsData, numVertices } = createRect(100, 100);

		const encoder = device.createCommandEncoder();
		const pass = encoder.beginRenderPass(renderPassDescriptor);

		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, rectVertexBuffer);
		pass.setIndexBuffer(rectIndexBuffer, 'uint32');
		pass.setVertexBuffer(1, rectColorBuffer);
		pass.setVertexBuffer(2, rectTextureCoordsBuffer);

		// Set the uniform values in our JavaScript side Float32Array
		resolutionValue.set([canvas.width, canvas.height]);

		// upload the uniform values to the uniform buffer
		device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

		// The zero here is the position to copy the vertex data into the rectVertexBuffer
		device.queue.writeBuffer(rectVertexBuffer, 0, vertexData);
		device.queue.writeBuffer(rectIndexBuffer, 0, indexData);
		device.queue.writeBuffer(rectColorBuffer, 0, colorData);
		device.queue.writeBuffer(rectTextureCoordsBuffer, 0, textureCoordsData);

		pass.setBindGroup(0, uniformsBindGroup);
		pass.setBindGroup(1, textureBindGroup);
		pass.drawIndexed(numVertices);

		pass.end();

		const commandBuffer = encoder.finish();
		device.queue.submit([commandBuffer]);
	}

	function frame () {
		render();
		requestAnimationFrame(frame);
	}

	frame();
}

const result = await start();
