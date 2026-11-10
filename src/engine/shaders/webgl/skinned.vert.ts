import {
	forwardInstanceMaterialChunk,
	instanceMaterialVaryingsChunk,
	skinningChunk,
	worldMatrixChunk
} from "@/engine/shaders/webgl/chunks";

/**
 * Skinned PBR Lit vertex shader.
 * Extends the lit shader with GPU-based skeletal animation support.
 * Supports up to 4 bone influences per vertex and 64 bones per skeleton.
 * Compiled with and without USE_INSTANCING (see chunks.ts); the instanced
 * variant reads each instance's bone palette from a float texture.
 */
export const skinnedVertexShader = `
precision highp float;

// Vertex attributes
attribute vec3 a_position;     // Vertex position
attribute vec3 a_normal;       // Vertex normal
attribute vec2 a_uv;           // Texture coordinates
uniform vec4 u_uvTransform;  // Texture coordinate scale (xy) and offset (zw)
attribute vec4 a_tangent;      // Tangent for normal mapping (xyz = tangent, w = handedness)

${worldMatrixChunk}
${skinningChunk}

// Uniforms
uniform mat4 u_viewMatrix;       // Camera view matrix
uniform mat4 u_projectionMatrix; // Camera projection matrix
uniform vec3 u_cameraPosition;   // Camera world position

// Shadow mapping uniforms
uniform mat4 u_lightSpaceMatrix; // Light view * projection matrix for shadow mapping
uniform float u_shadowNormalOffset; // Normal offset to prevent shadow acne

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
	vec3 skinnedPosition = a_position;
	vec3 skinnedNormal = a_normal;
	vec3 skinnedTangent = a_tangent.xyz;

	// Apply skinning if enabled
	if (u_useSkinning == 1) {
		mat4 skinMatrix = getSkinMatrix();

		// Transform position by skin matrix
		skinnedPosition = (skinMatrix * vec4(a_position, 1.0)).xyz;

		// Transform normal by skin matrix (upper-left 3x3)
		// Note: For correct normal transformation, we should use inverse transpose,
		// but for skeletal animation with uniform scales, the upper 3x3 is sufficient
		mat3 skinMatrix3 = mat3(skinMatrix);
		skinnedNormal = normalize(skinMatrix3 * a_normal);
		skinnedTangent = normalize(skinMatrix3 * a_tangent.xyz);
	}

	mat4 worldMatrix = getWorldMatrix();
	mat3 normalMatrix = getNormalMatrix(worldMatrix);

	// Transform position to world space
	vec4 worldPos = worldMatrix * vec4(skinnedPosition, 1.0);
	v_worldPosition = worldPos.xyz;

	// Transform normal to world space and normalize
	v_worldNormal = normalize(normalMatrix * skinnedNormal);

	v_vertexColor = u_hasVertexColors == 1 ? a_color : vec4(1.0);

	// Pass through UV coordinates
	// Texture transform (scale, then offset); unset (all zero) means none
	v_uv = (u_uvTransform.x == 0.0 && u_uvTransform.y == 0.0) ? a_uv : a_uv * u_uvTransform.xy + u_uvTransform.zw;

	// Calculate TBN matrix for normal mapping
	vec3 T = normalize(normalMatrix * skinnedTangent);
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
