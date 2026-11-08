/**
 * Sprite vertex shader for 2D rendering in 3D space.
 * Supports billboarding (always facing camera) for true 2D sprites.
 */
export const spriteVertexShader = `
precision mediump float;

// Vertex attributes
attribute vec2 a_position; // Quad vertex position (-0.5 to 0.5)
attribute vec2 a_uv;       // Texture coordinates (v = 0 at the image top)

// Uniforms
uniform mat4 u_worldMatrix;      // Entity world transform matrix
uniform mat4 u_viewMatrix;       // Camera view matrix
uniform mat4 u_projectionMatrix; // Camera projection matrix
uniform vec2 u_scale;            // Entity size (width, height)
uniform vec4 u_uvBounds;         // Texture region (minU, minV, maxU, maxV), e.g. a sprite sheet cell
uniform int u_billboardMode;     // 0=none, 1=full, 2=y-axis
uniform float u_flipY;           // -1 in a y-down 2D world (image top at local -y), else 1

// Varyings
varying vec2 v_uv;

void main() {
	// Map the quad's UVs onto the texture region (sprite sheet cell)
	v_uv = mix(u_uvBounds.xy, u_uvBounds.zw, a_uv);

	// Calculate vertex position
	vec3 position = vec3(a_position.x * u_scale.x, a_position.y * u_scale.y * u_flipY, 0.0);

	if (u_billboardMode == 0) {
		// No billboarding: standard 3D transform
		gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(position, 1.0);
		return;
	}

	// Billboards keep the entity's position and scale but face the camera.
	// The camera's world-space right/up axes are the first two ROWS of the
	// view matrix's rotation (the view matrix holds the inverse rotation).
	vec3 entityPos = u_worldMatrix[3].xyz;
	float scaleX = length(u_worldMatrix[0].xyz);
	float scaleY = length(u_worldMatrix[1].xyz);
	vec3 camRight = vec3(u_viewMatrix[0][0], u_viewMatrix[1][0], u_viewMatrix[2][0]);
	vec3 camUp;

	if (u_billboardMode == 2) {
		// Y-axis billboarding: rotate around the world Y axis only (cylindrical)
		camRight = normalize(vec3(camRight.x, 0.0, camRight.z));
		camUp = vec3(0.0, 1.0, 0.0);
	} else {
		// Full billboarding: always face the camera (spherical)
		camUp = vec3(u_viewMatrix[0][1], u_viewMatrix[1][1], u_viewMatrix[2][1]);
	}

	vec3 worldPos = entityPos + camRight * (position.x * scaleX) + camUp * (position.y * scaleY);
	gl_Position = u_projectionMatrix * u_viewMatrix * vec4(worldPos, 1.0);
}
`;
