"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BONES_PER_VERTEX = exports.MAX_BONES = void 0;
/**
 * Maximum number of bones supported per skeleton.
 * This limit is based on WebGL uniform limits.
 * 64 bones * 16 floats per mat4 = 1024 floats = 256 vec4 uniforms
 */
exports.MAX_BONES = 64;
/**
 * Maximum number of bone influences per vertex.
 * Standard GLTF uses 4 bones per vertex (JOINTS_0, WEIGHTS_0).
 */
exports.BONES_PER_VERTEX = 4;
