"use strict";
/**
 * Shared GLSL ES 1.0 snippets used by the built-in WebGL shaders.
 *
 * Every shader is compiled twice by the shader library: once as-is and once
 * with `#define USE_INSTANCING` prepended (registered as `<id>_instanced`).
 * The instanced variant reads its per-object data from per-instance vertex
 * attributes (and, for skinned meshes, a bone palette texture) instead of
 * uniforms, so a whole batch of identical meshes draws in one call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.forwardInstanceMaterialChunk = exports.instanceMaterialVaryingsChunk = exports.skinningChunk = exports.worldMatrixChunk = void 0;
/**
 * Per-instance attributes plus helpers that return the world matrix and
 * its normal matrix for the current vertex, in either mode.
 *
 * Instance attribute layout (see IgeWebGlInstanceBuffer):
 *   a_instanceMatrix0..3  world matrix columns
 *   a_instanceColor       base colour tint (rgba)
 *   a_instanceEmissive    emissive rgb + intensity
 *   a_instanceMaterial    metallic, roughness, opacity, bone palette row
 */
exports.worldMatrixChunk = `
uniform mat4 u_worldMatrix;

#ifdef USE_INSTANCING
attribute vec4 a_instanceMatrix0;
attribute vec4 a_instanceMatrix1;
attribute vec4 a_instanceMatrix2;
attribute vec4 a_instanceMatrix3;
attribute vec4 a_instanceColor;
attribute vec4 a_instanceEmissive;
attribute vec4 a_instanceMaterial;
#endif

mat4 getWorldMatrix() {
#ifdef USE_INSTANCING
	return mat4(a_instanceMatrix0, a_instanceMatrix1, a_instanceMatrix2, a_instanceMatrix3);
#else
	return u_worldMatrix;
#endif
}

// Inverse-transpose of the upper 3x3 (up to a positive scale factor, which
// the callers remove by normalising). Built from the cofactor matrix so it
// stays correct for non-uniform scale without needing inverse() (GLSL ES 3).
mat3 getNormalMatrix(mat4 m) {
	vec3 c0 = m[0].xyz;
	vec3 c1 = m[1].xyz;
	vec3 c2 = m[2].xyz;
	vec3 n0 = cross(c1, c2);
	vec3 n1 = cross(c2, c0);
	vec3 n2 = cross(c0, c1);
	// Mirrored transforms (negative determinant) would flip normals inward.
	float s = dot(c0, n0) < 0.0 ? -1.0 : 1.0;
	return mat3(n0 * s, n1 * s, n2 * s);
}
`;
/**
 * Bone palette lookup for skinned meshes. Non-instanced draws read the
 * u_boneMatrices uniform array; instanced draws read one row per instance
 * from an RGBA32F texture where each bone occupies four texels (columns).
 */
exports.skinningChunk = `
#define MAX_BONES 64

attribute vec4 a_boneWeights;  // Bone weights (4 influences per vertex)
attribute vec4 a_boneIndices;  // Bone indices (4 influences per vertex)

uniform int u_useSkinning;     // Whether to apply skinning (1 = yes, 0 = no)

#ifdef USE_INSTANCING
uniform sampler2D u_boneTexture;
uniform vec2 u_boneTextureSize; // (width, height) in texels

mat4 getBoneMatrix(float boneIndex) {
	float row = a_instanceMaterial.w;
	vec2 inv = 1.0 / u_boneTextureSize;
	float v = (row + 0.5) * inv.y;
	float x = boneIndex * 4.0;
	return mat4(
		texture2D(u_boneTexture, vec2((x + 0.5) * inv.x, v)),
		texture2D(u_boneTexture, vec2((x + 1.5) * inv.x, v)),
		texture2D(u_boneTexture, vec2((x + 2.5) * inv.x, v)),
		texture2D(u_boneTexture, vec2((x + 3.5) * inv.x, v))
	);
}
#else
uniform mat4 u_boneMatrices[MAX_BONES];

mat4 getBoneMatrix(float boneIndex) {
	return u_boneMatrices[int(boneIndex)];
}
#endif

mat4 getSkinMatrix() {
	return
		a_boneWeights.x * getBoneMatrix(a_boneIndices.x) +
		a_boneWeights.y * getBoneMatrix(a_boneIndices.y) +
		a_boneWeights.z * getBoneMatrix(a_boneIndices.z) +
		a_boneWeights.w * getBoneMatrix(a_boneIndices.w);
}
`;
/**
 * Varyings that carry per-instance material values from the vertex to the
 * fragment stage when instancing is enabled.
 */
exports.instanceMaterialVaryingsChunk = `
#ifdef USE_INSTANCING
varying vec4 v_instanceColor;
varying vec4 v_instanceEmissive;
varying vec4 v_instanceMaterial;
#endif
`;
/**
 * Vertex-stage statement that forwards the instance material attributes.
 */
exports.forwardInstanceMaterialChunk = `
#ifdef USE_INSTANCING
	v_instanceColor = a_instanceColor;
	v_instanceEmissive = a_instanceEmissive;
	v_instanceMaterial = a_instanceMaterial;
#endif
`;
