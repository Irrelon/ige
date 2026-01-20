/**
 * Shadow map depth fragment shader.
 * Outputs depth value for shadow mapping.
 *
 * For WebGL 1 we pack depth into RGBA since depth textures
 * may not be supported. For WebGL 2 we can use depth textures directly.
 */
export const shadowFragmentShader = `
precision highp float;

// Pack depth into RGBA for WebGL 1 compatibility
vec4 packDepth(float depth) {
	const vec4 bitShift = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);
	const vec4 bitMask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);
	vec4 comp = fract(depth * bitShift);
	comp -= comp.xxyz * bitMask;
	return comp;
}

void main() {
	// Output depth value
	// gl_FragCoord.z is already in [0, 1] range
	gl_FragColor = packDepth(gl_FragCoord.z);
}
`;

/**
 * WebGL 2 shadow fragment shader - just outputs depth directly
 * (used when depth textures are supported)
 */
export const shadowFragmentShaderWebGL2 = `#version 300 es
precision highp float;

void main() {
	// Depth is written automatically to the depth buffer
	// No color output needed when using depth texture
}
`;
