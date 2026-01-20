/**
 * Shadow map depth vertex shader.
 * Renders geometry from the light's perspective to create a depth map.
 */
export const shadowVertexShader = `
precision highp float;

// Vertex attributes
attribute vec3 a_position;

// Uniforms
uniform mat4 u_worldMatrix;          // Entity world transform
uniform mat4 u_lightSpaceMatrix;     // Light view * projection matrix

void main() {
	// Transform vertex position to light space
	gl_Position = u_lightSpaceMatrix * u_worldMatrix * vec4(a_position, 1.0);
}
`;
