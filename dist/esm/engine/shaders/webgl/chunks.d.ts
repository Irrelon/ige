/**
 * Shared GLSL ES 1.0 snippets used by the built-in WebGL shaders.
 *
 * Every shader is compiled twice by the shader library: once as-is and once
 * with `#define USE_INSTANCING` prepended (registered as `<id>_instanced`).
 * The instanced variant reads its per-object data from per-instance vertex
 * attributes (and, for skinned meshes, a bone palette texture) instead of
 * uniforms, so a whole batch of identical meshes draws in one call.
 */
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
export declare const worldMatrixChunk = "\nuniform mat4 u_worldMatrix;\n\n#ifdef USE_INSTANCING\nattribute vec4 a_instanceMatrix0;\nattribute vec4 a_instanceMatrix1;\nattribute vec4 a_instanceMatrix2;\nattribute vec4 a_instanceMatrix3;\nattribute vec4 a_instanceColor;\nattribute vec4 a_instanceEmissive;\nattribute vec4 a_instanceMaterial;\n#endif\n\nmat4 getWorldMatrix() {\n#ifdef USE_INSTANCING\n\treturn mat4(a_instanceMatrix0, a_instanceMatrix1, a_instanceMatrix2, a_instanceMatrix3);\n#else\n\treturn u_worldMatrix;\n#endif\n}\n\n// Inverse-transpose of the upper 3x3 (up to a positive scale factor, which\n// the callers remove by normalising). Built from the cofactor matrix so it\n// stays correct for non-uniform scale without needing inverse() (GLSL ES 3).\nmat3 getNormalMatrix(mat4 m) {\n\tvec3 c0 = m[0].xyz;\n\tvec3 c1 = m[1].xyz;\n\tvec3 c2 = m[2].xyz;\n\tvec3 n0 = cross(c1, c2);\n\tvec3 n1 = cross(c2, c0);\n\tvec3 n2 = cross(c0, c1);\n\t// Mirrored transforms (negative determinant) would flip normals inward.\n\tfloat s = dot(c0, n0) < 0.0 ? -1.0 : 1.0;\n\treturn mat3(n0 * s, n1 * s, n2 * s);\n}\n";
/**
 * Bone palette lookup for skinned meshes. Non-instanced draws read the
 * u_boneMatrices uniform array; instanced draws read one row per instance
 * from an RGBA32F texture where each bone occupies four texels (columns).
 */
export declare const skinningChunk = "\n#define MAX_BONES 64\n\nattribute vec4 a_boneWeights;  // Bone weights (4 influences per vertex)\nattribute vec4 a_boneIndices;  // Bone indices (4 influences per vertex)\n\nuniform int u_useSkinning;     // Whether to apply skinning (1 = yes, 0 = no)\n\n#ifdef USE_INSTANCING\nuniform sampler2D u_boneTexture;\nuniform vec2 u_boneTextureSize; // (width, height) in texels\n\nmat4 getBoneMatrix(float boneIndex) {\n\tfloat row = a_instanceMaterial.w;\n\tvec2 inv = 1.0 / u_boneTextureSize;\n\tfloat v = (row + 0.5) * inv.y;\n\tfloat x = boneIndex * 4.0;\n\treturn mat4(\n\t\ttexture2D(u_boneTexture, vec2((x + 0.5) * inv.x, v)),\n\t\ttexture2D(u_boneTexture, vec2((x + 1.5) * inv.x, v)),\n\t\ttexture2D(u_boneTexture, vec2((x + 2.5) * inv.x, v)),\n\t\ttexture2D(u_boneTexture, vec2((x + 3.5) * inv.x, v))\n\t);\n}\n#else\nuniform mat4 u_boneMatrices[MAX_BONES];\n\nmat4 getBoneMatrix(float boneIndex) {\n\treturn u_boneMatrices[int(boneIndex)];\n}\n#endif\n\nmat4 getSkinMatrix() {\n\treturn\n\t\ta_boneWeights.x * getBoneMatrix(a_boneIndices.x) +\n\t\ta_boneWeights.y * getBoneMatrix(a_boneIndices.y) +\n\t\ta_boneWeights.z * getBoneMatrix(a_boneIndices.z) +\n\t\ta_boneWeights.w * getBoneMatrix(a_boneIndices.w);\n}\n";
/**
 * Varyings that carry per-instance material values from the vertex to the
 * fragment stage when instancing is enabled.
 */
export declare const instanceMaterialVaryingsChunk = "\n#ifdef USE_INSTANCING\nvarying vec4 v_instanceColor;\nvarying vec4 v_instanceEmissive;\nvarying vec4 v_instanceMaterial;\n#endif\n";
/**
 * Vertex-stage statement that forwards the instance material attributes.
 */
export declare const forwardInstanceMaterialChunk = "\n#ifdef USE_INSTANCING\n\tv_instanceColor = a_instanceColor;\n\tv_instanceEmissive = a_instanceEmissive;\n\tv_instanceMaterial = a_instanceMaterial;\n#endif\n";
