/**
 * Skinned PBR Lit vertex shader.
 * Extends the lit shader with GPU-based skeletal animation support.
 * Supports up to 4 bone influences per vertex and 64 bones per skeleton.
 */
export const skinnedVertexShader = `
precision highp float;

// Maximum number of bones supported
#define MAX_BONES 64

// Vertex attributes
attribute vec3 a_position;     // Vertex position
attribute vec3 a_normal;       // Vertex normal
attribute vec2 a_uv;           // Texture coordinates
attribute vec4 a_tangent;      // Tangent for normal mapping (xyz = tangent, w = handedness)
attribute vec4 a_boneWeights;  // Bone weights (4 influences per vertex)
attribute vec4 a_boneIndices;  // Bone indices (4 influences per vertex)

// Uniforms
uniform mat4 u_worldMatrix;      // Entity world transform matrix
uniform mat4 u_viewMatrix;       // Camera view matrix
uniform mat4 u_projectionMatrix; // Camera projection matrix
uniform mat4 u_normalMatrix;     // Normal transformation matrix (inverse transpose of world)
uniform vec3 u_cameraPosition;   // Camera world position

// Shadow mapping uniforms
uniform mat4 u_lightSpaceMatrix; // Light view * projection matrix for shadow mapping

// Skinning uniforms
uniform mat4 u_boneMatrices[MAX_BONES]; // Bone transformation matrices
uniform int u_useSkinning;              // Whether to apply skinning (1 = yes, 0 = no)

// Varyings passed to fragment shader
varying vec3 v_worldPosition;    // Position in world space
varying vec3 v_worldNormal;      // Normal in world space
varying vec2 v_uv;               // Texture coordinates
varying vec3 v_viewDirection;    // Direction from surface to camera
varying mat3 v_TBN;              // Tangent-Bitangent-Normal matrix for normal mapping
varying vec4 v_lightSpacePos;    // Position in light space for shadow mapping

/**
 * Compute the skin matrix by blending 4 bone matrices.
 * Each vertex is influenced by up to 4 bones with associated weights.
 */
mat4 getSkinMatrix() {
	// Get bone indices as integers
	int idx0 = int(a_boneIndices.x);
	int idx1 = int(a_boneIndices.y);
	int idx2 = int(a_boneIndices.z);
	int idx3 = int(a_boneIndices.w);

	// Blend bone matrices by weights
	mat4 skinMatrix =
		a_boneWeights.x * u_boneMatrices[idx0] +
		a_boneWeights.y * u_boneMatrices[idx1] +
		a_boneWeights.z * u_boneMatrices[idx2] +
		a_boneWeights.w * u_boneMatrices[idx3];

	return skinMatrix;
}

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

	// Transform position to world space
	vec4 worldPos = u_worldMatrix * vec4(skinnedPosition, 1.0);
	v_worldPosition = worldPos.xyz;

	// Transform normal to world space and normalize
	v_worldNormal = normalize((u_normalMatrix * vec4(skinnedNormal, 0.0)).xyz);

	// Calculate view direction (from surface to camera)
	v_viewDirection = normalize(u_cameraPosition - worldPos.xyz);

	// Pass through UV coordinates
	v_uv = a_uv;

	// Calculate TBN matrix for normal mapping
	vec3 T = normalize((u_normalMatrix * vec4(skinnedTangent, 0.0)).xyz);
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
