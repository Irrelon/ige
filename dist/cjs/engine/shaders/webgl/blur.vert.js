"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blurVertexShader = void 0;
/**
 * Full-screen quad vertex shader for post-process blur passes.
 */
exports.blurVertexShader = `
precision highp float;

attribute vec2 a_position;
varying vec2 v_uv;

void main() {
	v_uv = a_position * 0.5 + 0.5;
	gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
