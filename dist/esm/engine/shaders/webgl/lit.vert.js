/**
 * PBR Lit vertex shader.
 * Supports positions, normals, UVs, and tangents for normal mapping.
 * Passes world-space data to fragment shader for lighting calculations.
 * Supports shadow mapping for directional lights.
 */
export const litVertexShader = `
precision highp float;

// Vertex attributes
attribute vec3 a_position;  // Vertex position
attribute vec3 a_normal;    // Vertex normal
attribute vec2 a_uv;        // Texture coordinates
attribute vec4 a_tangent;   // Tangent for normal mapping (xyz = tangent, w = handedness)

// Uniforms
uniform mat4 u_worldMatrix;      // Entity world transform matrix
uniform mat4 u_viewMatrix;       // Camera view matrix
uniform mat4 u_projectionMatrix; // Camera projection matrix
uniform mat4 u_normalMatrix;     // Normal transformation matrix (inverse transpose of world)
uniform vec3 u_cameraPosition;   // Camera world position

// Shadow mapping uniforms
uniform mat4 u_lightSpaceMatrix; // Light view * projection matrix for shadow mapping

// Varyings passed to fragment shader
varying vec3 v_worldPosition;    // Position in world space
varying vec3 v_worldNormal;      // Normal in world space
varying vec2 v_uv;               // Texture coordinates
varying vec3 v_viewDirection;    // Direction from surface to camera
varying mat3 v_TBN;              // Tangent-Bitangent-Normal matrix for normal mapping
varying vec4 v_lightSpacePos;    // Position in light space for shadow mapping

void main() {
	// Transform position to world space
	vec4 worldPos = u_worldMatrix * vec4(a_position, 1.0);
	v_worldPosition = worldPos.xyz;

	// Transform normal to world space and normalize
	v_worldNormal = normalize((u_normalMatrix * vec4(a_normal, 0.0)).xyz);

	// Calculate view direction (from surface to camera)
	v_viewDirection = normalize(u_cameraPosition - worldPos.xyz);

	// Pass through UV coordinates
	v_uv = a_uv;

	// Calculate TBN matrix for normal mapping if tangent is available
	// If no tangent provided, use a fallback
	vec3 T = normalize((u_normalMatrix * vec4(a_tangent.xyz, 0.0)).xyz);
	vec3 N = v_worldNormal;
	// Re-orthogonalize T with respect to N
	T = normalize(T - dot(T, N) * N);
	// Calculate bitangent
	vec3 B = cross(N, T) * a_tangent.w;
	v_TBN = mat3(T, B, N);

	// Calculate position in light space for shadow mapping
	v_lightSpacePos = u_lightSpaceMatrix * worldPos;

	// Transform to clip space
	gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
}
`;
