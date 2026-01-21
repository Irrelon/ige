/**
 * Maximum number of bones supported per skeleton.
 * This limit is based on WebGL uniform limits.
 * 64 bones * 16 floats per mat4 = 1024 floats = 256 vec4 uniforms
 */
export const MAX_BONES = 64;
/**
 * Maximum number of bone influences per vertex.
 * Standard GLTF uses 4 bones per vertex (JOINTS_0, WEIGHTS_0).
 */
export const BONES_PER_VERTEX = 4;
