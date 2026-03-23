/**
 * Point light shadow map vertex shader.
 * Transforms vertices to world space and passes world position to fragment shader
 * for linear distance calculation.
 */
export const pointShadowVertexShader = `
precision highp float;

// Vertex attributes
attribute vec3 a_position;

// Uniforms
uniform mat4 u_worldMatrix;          // Entity world transform
uniform mat4 u_lightSpaceMatrix;     // Light face view * projection matrix

// Pass world position to fragment shader for distance calculation
varying vec3 v_worldPosition;

void main() {
	vec4 worldPos = u_worldMatrix * vec4(a_position, 1.0);
	v_worldPosition = worldPos.xyz;
	gl_Position = u_lightSpaceMatrix * worldPos;
}
`;
