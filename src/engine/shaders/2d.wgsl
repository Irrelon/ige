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

  vsOut.position = uni.projectionViewMatrix * vec4f(vert.position, 0, 1);
  vsOut.color = vert.color;
  vsOut.texCoords = vert.texCoords;

  return vsOut;
}

@fragment fn fs(fragData: VertexShaderResult) -> @location(0) vec4f {
  var textureColor = textureSample(texture, texSampler, fragData.texCoords);
  return fragData.color * textureColor;
}
