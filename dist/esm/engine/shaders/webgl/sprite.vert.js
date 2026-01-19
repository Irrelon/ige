/**
 * Sprite vertex shader for 2D rendering in 3D space.
 * Supports billboarding (always facing camera) for true 2D sprites.
 */
export const spriteVertexShader = `
precision mediump float;

// Vertex attributes
attribute vec2 a_position; // Quad vertex position (-0.5 to 0.5)
attribute vec2 a_uv;       // Texture coordinates

// Uniforms
uniform mat4 u_worldMatrix;      // Entity world transform matrix
uniform mat4 u_viewMatrix;       // Camera view matrix
uniform mat4 u_projectionMatrix; // Camera projection matrix
uniform vec2 u_scale;            // Entity scale (width, height)
uniform vec4 u_uvBounds;         // Texture atlas bounds (minU, minV, maxU, maxV)
uniform int u_billboardMode;     // 0=none, 1=full, 2=y-axis

// Varyings
varying vec2 v_uv;

void main() {
	// Apply UV bounds for texture atlas support
	v_uv = vec2(
		mix(u_uvBounds.x, u_uvBounds.z, a_uv.x),
		mix(u_uvBounds.y, u_uvBounds.w, a_uv.y)
	);

	// Calculate vertex position
	vec3 position = vec3(a_position * u_scale, 0.0);

	if (u_billboardMode == 1) {
		// Full billboarding: sprite always faces camera (spherical)
		// Extract camera right and up vectors from view matrix (column-major format)
		// Column 0 = right vector, Column 1 = up vector
		vec3 camRight = vec3(u_viewMatrix[0][0], u_viewMatrix[0][1], u_viewMatrix[0][2]);
		vec3 camUp = vec3(u_viewMatrix[1][0], u_viewMatrix[1][1], u_viewMatrix[1][2]);

		// Get entity position from world matrix
		vec3 entityPos = vec3(u_worldMatrix[3][0], u_worldMatrix[3][1], u_worldMatrix[3][2]);

		// Construct billboard position facing camera
		vec3 worldPos = entityPos + camRight * position.x + camUp * position.y;

		gl_Position = u_projectionMatrix * u_viewMatrix * vec4(worldPos, 1.0);
	}
	else if (u_billboardMode == 2) {
		// Y-axis billboarding: sprite rotates around Y axis only (cylindrical)
		// Extract only X and Z components of right vector (ignore Y)
		vec3 camRight = vec3(u_viewMatrix[0][0], 0.0, u_viewMatrix[0][2]);
		camRight = normalize(camRight);
		vec3 camUp = vec3(0.0, 1.0, 0.0);

		vec3 entityPos = vec3(u_worldMatrix[3][0], u_worldMatrix[3][1], u_worldMatrix[3][2]);
		vec3 worldPos = entityPos + camRight * position.x + camUp * position.y;

		gl_Position = u_projectionMatrix * u_viewMatrix * vec4(worldPos, 1.0);
	}
	else {
		// No billboarding: standard 3D transform
		gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(position, 1.0);
	}
}
`;
