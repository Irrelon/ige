import { vertexBufferLayoutByFormat } from "@/engine/utils/buffers";

const shaderSource = `
struct Uniforms {
  projectionViewMatrix: mat4x4f,
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

  //let i = f32(instance);
  //let position = vert.position;

  // convert the position from pixels to a 0.0 to 1.0 value
  //let zeroToOne = position / uni.resolution;

  // convert from 0 <-> 1 to 0 <-> 2
  //let zeroToTwo = zeroToOne * 2.0;

  // covert from 0 <-> 2 to -1 <-> +1 (clip space)
  //let flippedClipSpace = zeroToTwo - 1.0;

  // flip Y
  //let clipSpace = flippedClipSpace * vec2f(1, -1);

  //vsOut.position = vec4f(clipSpace, 0.0, 1.0);
  
  vsOut.position = uni.projectionViewMatrix * vec4f(vert.position, 0, 1);
  vsOut.color = vert.color;
  vsOut.texCoords = vert.texCoords;

  return vsOut;
}

@fragment fn fs(fragData: VertexShaderResult) -> @location(0) vec4f {
  var textureColor = textureSample(texture, texSampler, fragData.texCoords);
  return fragData.color * textureColor;
}
`;

// x, y, r, g, b, a, u, v
export const vertexDataFormat = [0, 0, 1, 1, 1, 1, 2, 2];

export const getShaderModule = (device: GPUDevice) => {
	return device.createShaderModule({
		code: shaderSource
	});
};

export const getPipeline = (device: GPUDevice, textureFormat: GPUTextureFormat, pipelineLayout: GPUPipelineLayout): GPURenderPipeline => {
	const shaderModule = getShaderModule(device);
	const vertexBufferLayout = vertexBufferLayoutByFormat(vertexDataFormat);

	const pipelineData: GPURenderPipelineDescriptor = {
		label: "default render pipeline",
		layout: pipelineLayout,
		vertex: {
			module: shaderModule,
			entryPoint: "vs",
			buffers: [
				vertexBufferLayout
			]
		},
		fragment: {
			module: shaderModule,
			entryPoint: "fs",
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
			}]
		},
		primitive: {
			topology: "triangle-list" // type of primitive to render
		}
	};
	console.log(pipelineData);

	return device.createRenderPipeline(pipelineData);
};
