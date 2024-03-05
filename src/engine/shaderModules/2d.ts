export const getShaderModule = (device: GPUDevice) => {
	return device.createShaderModule({
		code: `
struct Uniforms {
  color: vec4f,
  resolution: vec2f,
};
 
struct Vertex {
  @location(0) position: vec2f,
};
 
struct VSOutput {
  @builtin(position) position: vec4f,
};
 
@group(0) @binding(0) var<uniform> uni: Uniforms;
 
@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;
  
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
  return vsOut;
}
 
@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return uni.color;
}
    `
	});
};

export const getPipeline = (device: GPUDevice, textureFormat: GPUTextureFormat) => {
	const shaderModule = getShaderModule(device);

	return device.createRenderPipeline({
		label: "just 2d position",
		layout: "auto",
		vertex: {
			module: shaderModule,
			entryPoint: "vs",
			buffers: [
				{
					arrayStride: (2) * 4, // (2) floats, 4 bytes each
					attributes: [
						{ shaderLocation: 0, offset: 0, format: "float32x2" }  // position
					]
				}
			]
		},
		fragment: {
			module: shaderModule,
			entryPoint: "fs",
			targets: [{ format: textureFormat }]
		}
	});
};
