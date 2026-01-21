/**
 * Skinned shadow depth pass vertex shader.
 * Renders skinned meshes from the light's perspective for shadow mapping.
 */
export const skinnedShadowVertexShader = `
precision highp float;

// Maximum number of bones supported
#define MAX_BONES 64

// Vertex attributes
attribute vec3 a_position;     // Vertex position
attribute vec4 a_boneWeights;  // Bone weights (4 influences per vertex)
attribute vec4 a_boneIndices;  // Bone indices (4 influences per vertex)

// Uniforms
uniform mat4 u_worldMatrix;      // Entity world transform matrix
uniform mat4 u_lightSpaceMatrix; // Light view * projection matrix

// Skinning uniforms
uniform mat4 u_boneMatrices[MAX_BONES]; // Bone transformation matrices
uniform int u_useSkinning;              // Whether to apply skinning (1 = yes, 0 = no)

/**
 * Compute the skin matrix by blending 4 bone matrices.
 */
mat4 getSkinMatrix() {
	int idx0 = int(a_boneIndices.x);
	int idx1 = int(a_boneIndices.y);
	int idx2 = int(a_boneIndices.z);
	int idx3 = int(a_boneIndices.w);

	mat4 skinMatrix =
		a_boneWeights.x * u_boneMatrices[idx0] +
		a_boneWeights.y * u_boneMatrices[idx1] +
		a_boneWeights.z * u_boneMatrices[idx2] +
		a_boneWeights.w * u_boneMatrices[idx3];

	return skinMatrix;
}

void main() {
	vec3 skinnedPosition = a_position;

	// Apply skinning if enabled
	if (u_useSkinning == 1) {
		mat4 skinMatrix = getSkinMatrix();
		skinnedPosition = (skinMatrix * vec4(a_position, 1.0)).xyz;
	}

	// Transform to world space then to light space
	vec4 worldPos = u_worldMatrix * vec4(skinnedPosition, 1.0);
	gl_Position = u_lightSpaceMatrix * worldPos;
}
`;
