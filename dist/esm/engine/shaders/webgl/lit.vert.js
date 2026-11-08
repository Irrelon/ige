import { forwardInstanceMaterialChunk, instanceMaterialVaryingsChunk, worldMatrixChunk } from "./chunks.js"
/**
 * PBR Lit vertex shader.
 * Supports positions, normals, UVs, and tangents for normal mapping.
 * Passes world-space data to fragment shader for lighting calculations.
 * Supports shadow mapping for directional lights.
 * Compiled with and without USE_INSTANCING (see chunks.ts).
 */
export const litVertexShader = `
precision highp float;

// Vertex attributes
attribute vec3 a_position;  // Vertex position
attribute vec3 a_normal;    // Vertex normal
attribute vec2 a_uv;        // Texture coordinates
attribute vec4 a_tangent;   // Tangent for normal mapping (xyz = tangent, w = handedness)

${worldMatrixChunk}

// Uniforms
uniform mat4 u_viewMatrix;       // Camera view matrix
uniform mat4 u_projectionMatrix; // Camera projection matrix
uniform vec3 u_cameraPosition;   // Camera world position

// Shadow mapping uniforms
uniform mat4 u_lightSpaceMatrix; // Light view * projection matrix for shadow mapping
uniform float u_shadowNormalOffset; // Normal offset to prevent shadow acne on curved surfaces

// Varyings passed to fragment shader
varying vec3 v_worldPosition;    // Position in world space
varying vec3 v_worldNormal;      // Normal in world space
varying vec2 v_uv;               // Texture coordinates
varying vec4 v_vertexColor;      // Vertex colour (white when the geometry has none)
varying mat3 v_TBN;              // Tangent-Bitangent-Normal matrix for normal mapping
varying vec4 v_lightSpacePos;    // Position in light space for shadow mapping
${instanceMaterialVaryingsChunk}

// Optional per-vertex colour, multiplied into the base colour. Read only
// when u_hasVertexColors is 1: without the attribute it reads as black.
attribute vec4 a_color;
uniform int u_hasVertexColors;

void main() {
	mat4 worldMatrix = getWorldMatrix();
	mat3 normalMatrix = getNormalMatrix(worldMatrix);

	// Transform position to world space
	vec4 worldPos = worldMatrix * vec4(a_position, 1.0);
	v_worldPosition = worldPos.xyz;

	// Transform normal to world space and normalize
	v_worldNormal = normalize(normalMatrix * a_normal);

	v_vertexColor = u_hasVertexColors == 1 ? a_color : vec4(1.0);

	// Pass through UV coordinates
	v_uv = a_uv;

	// Calculate TBN matrix for normal mapping if tangent is available
	// If no tangent provided, use a fallback
	vec3 T = normalize(normalMatrix * a_tangent.xyz);
	vec3 N = v_worldNormal;
	// Re-orthogonalize T with respect to N
	T = normalize(T - dot(T, N) * N);
	// Calculate bitangent
	vec3 B = cross(N, T) * a_tangent.w;
	v_TBN = mat3(T, B, N);

	// Calculate position in light space for shadow mapping
	vec3 shadowPos = worldPos.xyz + v_worldNormal * u_shadowNormalOffset;
	v_lightSpacePos = u_lightSpaceMatrix * vec4(shadowPos, 1.0);
${forwardInstanceMaterialChunk}
	// Transform to clip space
	gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
}
`;
