async function getGpu () {
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
	const context = canvas.getContext("webgpu");
	if (!context) {
		console.error("WebGPU cannot be initialized - Canvas does not support WebGPU");
		return null;
	}
	const devicePixelRatio = window.devicePixelRatio || 1;
	const presentationSize = [
		canvas.clientWidth * devicePixelRatio,
		canvas.clientHeight * devicePixelRatio
	];
	const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

	context.configure({
		device,
		format: presentationFormat,
		alphaMode: "opaque"
	});

	const vertices = new Float32Array([
		-1.0, -1.0, 0, 1, 1, 0, 0, 1,
		-0.0, 1.0, 0, 1, 0, 1, 0, 1,
		1.0, -1.0, 0, 1, 0, 0, 1, 1
	]);

	const vertexBuffer = device.createBuffer({
		size: vertices.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		mappedAtCreation: true
	});
	new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
	vertexBuffer.unmap();

	const vertexBuffersDescriptors = [{
		attributes: [
			{
				shaderLocation: 0,
				offset: 0,
				format: "float32x4"
			},
			{
				shaderLocation: 1,
				offset: 16,
				format: "float32x4"
			}
		],
		arrayStride: 32,
		stepMode: "vertex"
	}];

	const shaderModule = device.createShaderModule({
		code: `
        struct VertexOut {
            @builtin(position) position : vec4<f32>,
            @location(0) color : vec4<f32>,
        };

        @vertex
        fn vertex_main(@location(0) position: vec4<f32>,
                    @location(1) color: vec4<f32>) -> VertexOut
        {
            var output : VertexOut;
            output.position = position;
            output.color = color;
            return output;
        } 

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
        {
            return fragData.color;
        } 
    `
	});

	const pipeline = device.createRenderPipeline({
		vertex: {
			module: shaderModule,
			entryPoint: "vertex_main",
			buffers: vertexBuffersDescriptors
		},
		fragment: {
			module: shaderModule,
			entryPoint: "fragment_main",
			targets: [
				{
					format: presentationFormat
				}
			]
		},
		primitive: {
			topology: "triangle-list"
		},
		layout: "auto"
	});

	function frame () {
		const commandEncoder = device.createCommandEncoder();
		const textureView = context.getCurrentTexture().createView();

		const renderPassDescriptor = {
			colorAttachments: [
				{
					view: textureView,
					clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
					loadOp: "clear",
					storeOp: "store"
				}
			]
		};

		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

		passEncoder.setPipeline(pipeline);
		passEncoder.setVertexBuffer(0, vertexBuffer);
		passEncoder.draw(3);
		passEncoder.end();

		device.queue.submit([commandEncoder.finish()]);
		requestAnimationFrame(frame);
	}

	frame();
}

const result = await getGpu();
