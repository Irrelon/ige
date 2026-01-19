/**
 * Basic 3D model vertex shader.
 * Supports position, normal, and UV attributes.
 * This is a simple shader for Phase 1; PBR lighting will be added in Phase 3.
 */
export const modelVertexShader = `
precision mediump float;

// Vertex attributes
attribute vec3 a_position; // Vertex position
attribute vec3 a_normal;   // Vertex normal
attribute vec2 a_uv;       // Texture coordinates

// Uniforms
uniform mat4 u_worldMatrix;      // Entity world transform matrix
uniform mat4 u_viewMatrix;       // Camera view matrix
uniform mat4 u_projectionMatrix; // Camera projection matrix
uniform mat4 u_normalMatrix;     // Normal transformation matrix (inverse transpose of world)

// Varyings
varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;

void main() {
	// Transform position to world space
	vec4 worldPos = u_worldMatrix * vec4(a_position, 1.0);
	v_worldPosition = worldPos.xyz;

	// Transform normal to world space
	v_worldNormal = normalize((u_normalMatrix * vec4(a_normal, 0.0)).xyz);

	// Pass through UV coordinates
	v_uv = a_uv;

	// Transform to clip space
	gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
}
`;
